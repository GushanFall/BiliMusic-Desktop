package app.bilimusic.player

import android.content.Intent
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.session.MediaSession
import android.view.KeyEvent
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.Implements
import org.robolectric.annotation.Implementation
import org.robolectric.shadow.api.Shadow
import org.robolectric.shadows.ShadowMediaPlayer
import org.robolectric.shadows.ShadowMediaSession
import org.robolectric.shadows.util.DataSource
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28, 35], manifest = Config.NONE, shadows = [RecordingMediaSessionShadow::class])
class BackgroundPlaybackTest {
    private lateinit var service: PlaybackService
    private lateinit var profile: File
    private val requests = mutableListOf<Pair<Long, JSONObject>>()
    private val url = "http://127.0.0.1:1234/token/test"
    private fun track(id: String) = JSONObject().put("id", id).put("title", "song $id").put("durationSeconds", 120)
        .put("source", JSONObject().put("provider", "bilibili").put("bvid", "BV123").put("cid", id.toInt()).put("page", id.toInt()))
    private fun field(name: String): Any? = PlaybackService::class.java.getDeclaredField(name).apply { isAccessible = true }.get(service)
    private fun player() = field("player") as MediaPlayer
    private fun idle() { shadowOf(android.os.Looper.getMainLooper()).idle() }
    private fun load() {
        service.onStartCommand(Intent(service, PlaybackService::class.java).setAction("load").putExtra("id", "1")
            .putExtra("url", url).putExtra("title", "song 1"), 0, 1)
        idle()
        assertEquals("playing", service.snapshot().getString("status"))
    }
    private fun reply(request: Pair<Long, JSONObject>) {
        service.resolved(request.first, JSONObject().put("url", url).put("track", request.second.getJSONObject("track")).put("position", request.second.optDouble("position", 0.0)))
        idle()
    }
    @Before fun setup() {
        profile = File.createTempFile("bilimusic-native-profile", ".txt").apply { writeText("account") }
        PlaybackService.profilePath = profile.path; PlaybackService.listener = null
        PlaybackService.queueData = JSONObject().put("tracks", JSONArray(listOf(track("1"), track("2"), track("3"))))
            .put("repeatMode", "off").toString()
        PlaybackService.resolveListener = { request, payload -> requests.add(request to payload) }
        ShadowMediaPlayer.addMediaInfo(DataSource.toDataSource(url), ShadowMediaPlayer.MediaInfo(120_000, 0))
        service = Robolectric.buildService(PlaybackService::class.java).create().get()
    }
    @After fun cleanup() {
        service.onDestroy(); profile.delete()
        PlaybackService.listener = null; PlaybackService.resolveListener = null; PlaybackService.listeningListener = null
        PlaybackService.controllerListener = null; PlaybackService.queueData = null; PlaybackService.profilePath = null
    }
    @Test fun completedTracksAdvanceWithoutAnyWebViewListener() {
        load(); shadowOf(player()).invokeCompletionListener()
        assertEquals("2", requests.single().second.getJSONObject("track").getString("id"))
        reply(requests.last()); assertEquals("2", service.snapshot().getString("id"))
        assertEquals("playing", service.snapshot().getString("status"))
        shadowOf(player()).invokeCompletionListener(); reply(requests.last())
        shadowOf(player()).invokeCompletionListener()
        assertEquals(2, requests.size); assertEquals("paused", service.snapshot().getString("status"))
    }
    @Test fun pauseAndRapidSkipInvalidateLateResolverReplies() {
        load(); service.control("next"); val old = requests.last()
        service.control("next"); val latest = requests.last()
        reply(old); assertEquals("3", service.snapshot().getString("id")); assertTrue(service.snapshot().getBoolean("stopped"))
        service.control("pause"); reply(latest)
        assertEquals("paused", service.snapshot().getString("status")); assertTrue(service.snapshot().getBoolean("stopped"))
        assertNull(field("transitionWakeLock"))
    }
    @Test fun accountChangeRejectsAnOldBackgroundReply() {
        load(); service.control("next"); profile.writeText("different-account"); reply(requests.last())
        assertEquals("error", service.snapshot().getString("status")); assertTrue(service.snapshot().getBoolean("stopped"))
    }
    @Test fun networkFailureRefreshesNativelyOnceAndExplicitRetryWorks() {
        load(); service.control("seek", 32.0); idle()
        shadowOf(player()).invokeErrorListener(MediaPlayer.MEDIA_ERROR_UNKNOWN, MediaPlayer.MEDIA_ERROR_IO)
        assertTrue(requests.last().second.getBoolean("refresh")); assertEquals(32.0, requests.last().second.getDouble("position"), 0.1)
        reply(requests.last()); shadowOf(player()).invokeErrorListener(MediaPlayer.MEDIA_ERROR_UNKNOWN, MediaPlayer.MEDIA_ERROR_IO)
        assertEquals(1, requests.size); assertEquals("error", service.snapshot().getString("status"))
        service.control("resume"); reply(requests.last())
        assertEquals("playing", service.snapshot().getString("status"))
        service.control("seek", 45.0); idle(); assertEquals(45.0, service.snapshot().getDouble("position"), 0.1)
    }
    @Test fun failureBeforePreparationStillAppliesTheAutomaticDurationThreshold() {
        ShadowMediaPlayer.addMediaInfo(DataSource.toDataSource(url), ShadowMediaPlayer.MediaInfo(120_000, 10_000))
        service.onStartCommand(Intent(service, PlaybackService::class.java).setAction("load").putExtra("id", "1")
            .putExtra("url", url).putExtra("position", 85.0).putExtra("automaticResume", true)
            .putExtra("resumeEnabled", true).putExtra("resumeThreshold", 600.0), 0, 1)
        shadowOf(player()).invokeErrorListener(MediaPlayer.MEDIA_ERROR_UNKNOWN, MediaPlayer.MEDIA_ERROR_IO)
        assertEquals(85.0, requests.single().second.getDouble("position"), 0.0)
        ShadowMediaPlayer.addMediaInfo(DataSource.toDataSource(url), ShadowMediaPlayer.MediaInfo(120_000, 0))
        reply(requests.single())
        assertEquals("playing", service.snapshot().getString("status"))
        assertEquals(0.0, service.snapshot().getDouble("position"), 0.0)
    }
    @Test fun anotherPlayerTakingFocusDoesNotDestroyThePlayableTimeline() {
        load(); service.control("seek", 25.0); idle()
        val focus = shadowOf(service.getSystemService(AudioManager::class.java)).lastAudioFocusRequest
        focus.listener.onAudioFocusChange(AudioManager.AUDIOFOCUS_LOSS)
        assertEquals("paused", service.snapshot().getString("status"))
        service.control("resume"); service.control("seek", 40.0); idle()
        assertEquals("playing", service.snapshot().getString("status")); assertEquals(40.0, service.snapshot().getDouble("position"), 0.1)
    }
    @Test fun headsetReceiverTargetsThisServiceAndConsumesKeyUpOnce() {
        load()
        val receiver = MediaButtonReceiver()
        for (action in listOf(KeyEvent.ACTION_DOWN, KeyEvent.ACTION_UP)) receiver.onReceive(service,
            Intent(Intent.ACTION_MEDIA_BUTTON).putExtra(Intent.EXTRA_KEY_EVENT, KeyEvent(action, KeyEvent.KEYCODE_MEDIA_NEXT)))
        assertEquals(1, requests.size); assertEquals("2", requests.single().second.getJSONObject("track").getString("id"))
    }
    @Test fun sessionPublishesMetadataAndControllerWithoutOpeningAnActivity() {
        var controller: android.media.session.MediaController? = null
        PlaybackService.controllerListener = { controller = it }; service.attachController(); load()
        val session = field("session") as MediaSession
        assertNotNull(controller); assertSame(session.controller, controller)
        // Robolectric's controller shadow does not receive Binder metadata updates.
        val metadata = Shadow.extract<RecordingMediaSessionShadow>(session).publishedMetadata!!
        assertEquals("1", metadata.getString(android.media.MediaMetadata.METADATA_KEY_MEDIA_ID))
        assertTrue(session.isActive)
    }
}

@Implements(MediaSession::class)
class RecordingMediaSessionShadow : ShadowMediaSession() {
    var publishedMetadata: android.media.MediaMetadata? = null
        private set
    @Implementation protected fun setMetadata(value: android.media.MediaMetadata?) { publishedMetadata = value }
}
