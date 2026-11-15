package app.bilimusic.player

import android.content.ContentProvider
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.database.MatrixCursor
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.DocumentsContract
import android.provider.MediaStore
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.IOException
import java.io.OutputStream
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowContentResolver

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28, 29, 35], manifest = Config.NONE)
class DownloadStorageTest {
    private val context get() = RuntimeEnvironment.getApplication()
    private val grants = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
    private val tree = Uri.parse("content://test.downloads/tree/music")
    private lateinit var storage: DownloadStorage
    private lateinit var provider: StorageProvider
    private lateinit var source: File

    @Before fun setup() {
        context.getSharedPreferences("bilimusic-downloads", Context.MODE_PRIVATE).edit().clear().commit()
        provider = StorageProvider(context)
        provider.attachInfo(context, android.content.pm.ProviderInfo().apply { authority = "test.downloads;media" })
        ShadowContentResolver.registerProviderInternal("media", provider)
        ShadowContentResolver.registerProviderInternal("test.downloads", provider)
        storage = DownloadStorage(context)
        source = File(context.applicationInfo.dataDir, "downloads/测试歌曲.flac").apply { parentFile!!.mkdirs(); writeBytes(byteArrayOf(1, 2, 3, 4)) }
    }
    @Test fun defaultDestinationIsPublicOnModernAndroidAndRequiresSelectionOnOlderAndroid() {
        assertEquals(Build.VERSION.SDK_INT >= 29, storage.status().getBoolean("available"))
        assertFalse(storage.status().getBoolean("custom"))
        if (Build.VERSION.SDK_INT < 29) {
            try { storage.save(source.path); fail("must not silently save privately") } catch (_: IllegalStateException) { }
            assertEquals(0, provider.created.size)
        }
    }
    @Test fun publicDownloadPublishesOnlyAfterAllBytesWereWritten() {
        assumeTrue(Build.VERSION.SDK_INT >= 29)
        storage.save(source.path)
        assertEquals("测试歌曲.flac", provider.created.single().getAsString(MediaStore.MediaColumns.DISPLAY_NAME))
        assertEquals("audio/flac", provider.created.single().getAsString(MediaStore.MediaColumns.MIME_TYPE))
        assertEquals("Download/BiliMusic", provider.created.single().getAsString(MediaStore.MediaColumns.RELATIVE_PATH))
        assertEquals(1, provider.created.single().getAsInteger(MediaStore.MediaColumns.IS_PENDING))
        assertArrayEquals(source.readBytes(), provider.output.toByteArray())
        assertTrue(provider.published); assertTrue(provider.deleted.isEmpty())
        assertTrue(source.exists()) // Offline playback keeps its own managed copy.
    }
    @Test fun selectedFolderSurvivesRecreationAndExportsThroughTheDocumentProvider() {
        storage.select(tree, grants)
        storage = DownloadStorage(context)
        assertTrue(storage.status().getBoolean("available"))
        assertEquals("我的音乐", storage.status().getString("label"))
        storage.save(source.path)
        assertEquals("测试歌曲.flac", provider.created.single().getAsString(DocumentsContract.Document.COLUMN_DISPLAY_NAME))
        assertArrayEquals(source.readBytes(), provider.output.toByteArray())
    }
    @Test fun revokedPermissionStopsExportWithoutFallingBackToAnotherFolder() {
        storage.select(tree, grants)
        context.contentResolver.releasePersistableUriPermission(tree, grants)
        assertFalse(storage.status().getBoolean("available"))
        try { storage.save(source.path); fail("revoked grant must fail") } catch (_: IllegalStateException) { }
        assertTrue(provider.created.isEmpty())
    }
    @Test fun failedNewSelectionKeepsThePreviouslySelectedFolder() {
        storage.select(tree, grants)
        provider.writable = false
        val other = Uri.parse("content://test.downloads/tree/other")
        try { storage.select(other, grants); fail("read-only folder must fail") } catch (_: IllegalStateException) { }
        assertTrue(storage.status().getBoolean("available"))
        assertEquals(listOf(tree), context.contentResolver.persistedUriPermissions.map { it.uri })
    }
    @Test fun readOnlyGrantIsRejected() {
        try { storage.select(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION); fail("write permission required") } catch (_: IllegalArgumentException) { }
        assertFalse(storage.status().getBoolean("custom"))
    }
    @Test fun incompletePublicWriteRemovesThePartialFile() {
        assumeTrue(Build.VERSION.SDK_INT >= 29)
        provider.failWrite = true
        try { storage.save(source.path); fail("write should fail") } catch (_: IOException) { }
        assertEquals(1, provider.deleted.size); assertFalse(provider.published); assertTrue(source.exists())
    }
    @Test fun incompleteDocumentWriteRemovesThePartialFile() {
        storage.select(tree, grants); provider.failWrite = true
        try { storage.save(source.path); fail("write should fail") } catch (_: IOException) { }
        assertEquals(1, provider.deleted.size); assertTrue(source.exists())
    }
    @Test fun restoringDefaultReleasesOnlyThisAppsSelectedFolderGrant() {
        assumeTrue(Build.VERSION.SDK_INT >= 29)
        storage.select(tree, grants); storage.reset()
        assertFalse(storage.status().getBoolean("custom")); assertTrue(storage.status().getBoolean("available"))
        assertTrue(context.contentResolver.persistedUriPermissions.isEmpty())
    }
    @Test fun exportsRejectFilesOutsideTheManagedDownloadsDirectory() {
        val file = File(context.cacheDir, "secret.flac").apply { writeText("private") }
        try { storage.save(file.path); fail("outside path must fail") } catch (_: IllegalArgumentException) { }
        assertTrue(provider.created.isEmpty())
        val link = File(source.parentFile, "link.flac")
        java.nio.file.Files.deleteIfExists(link.toPath())
        java.nio.file.Files.createSymbolicLink(link.toPath(), file.toPath())
        try { storage.save(link.path); fail("symlink must not escape") } catch (_: IllegalArgumentException) { }
        assertTrue(provider.created.isEmpty())
    }
    @Test fun systemPickerRequestsPersistableWriteAccessWithoutAllFilesPermission() {
        val intent = storage.pickerIntent()
        assertEquals(Intent.ACTION_OPEN_DOCUMENT_TREE, intent.action)
        assertEquals(grants, intent.flags and grants)
        assertTrue(intent.flags and Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION != 0)
    }
}

private class StorageProvider(private val app: Context) : ContentProvider() {
    var writable = true
    var failWrite = false
    var published = false
    val created = mutableListOf<ContentValues>()
    val deleted = mutableListOf<Uri>()
    val output = ByteArrayOutputStream()
    private fun register(uri: Uri): Uri {
        shadowOf(app.contentResolver).registerOutputStream(uri, if (failWrite) object : OutputStream() {
            override fun write(value: Int) { throw IOException("disk full") }
        } else output)
        return uri
    }
    override fun onCreate() = true
    override fun getType(uri: Uri) = "audio/flac"
    override fun query(uri: Uri, projection: Array<out String>?, selection: String?, args: Array<out String>?, sort: String?) =
        MatrixCursor(projection!!).apply { addRow(projection.map { when (it) {
            DocumentsContract.Document.COLUMN_DISPLAY_NAME -> "我的音乐"
            DocumentsContract.Document.COLUMN_MIME_TYPE -> DocumentsContract.Document.MIME_TYPE_DIR
            DocumentsContract.Document.COLUMN_FLAGS -> if (writable) DocumentsContract.Document.FLAG_DIR_SUPPORTS_CREATE else 0
            else -> null
        } }) }
    override fun insert(uri: Uri, values: ContentValues?): Uri {
        created.add(ContentValues(values!!))
        return register(Uri.withAppendedPath(uri, created.size.toString()))
    }
    override fun update(uri: Uri, values: ContentValues?, selection: String?, args: Array<out String>?): Int {
        assertArrayEquals(byteArrayOf(1, 2, 3, 4), output.toByteArray())
        published = values!!.getAsInteger(MediaStore.MediaColumns.IS_PENDING) == 0
        return 1
    }
    override fun delete(uri: Uri, selection: String?, args: Array<out String>?): Int { deleted.add(uri); return 1 }
    override fun call(method: String, arg: String?, extras: Bundle?): Bundle {
        return when (method) {
            "android:createDocument" -> {
                created.add(ContentValues().apply {
                    put(DocumentsContract.Document.COLUMN_DISPLAY_NAME, extras!!.getString(DocumentsContract.Document.COLUMN_DISPLAY_NAME))
                    put(DocumentsContract.Document.COLUMN_MIME_TYPE, extras.getString(DocumentsContract.Document.COLUMN_MIME_TYPE))
                })
                Bundle().apply { putParcelable("uri", register(DocumentsContract.buildDocumentUri("test.downloads", "saved-${created.size}"))) }
            }
            "android:deleteDocument" -> { deleted.add(extras!!.getParcelable<Uri>("uri")!!); Bundle() }
            else -> error("Unexpected document operation: $method")
        }
    }
}
