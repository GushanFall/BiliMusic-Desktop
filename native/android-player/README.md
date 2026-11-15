# Android native player

Local Tauri plugin used only on Android. `PlayerPlugin` exposes play/queue/control/snapshot and a state event; `PlaybackService` owns MediaPlayer, the foreground notification, MediaSession and audio focus. Rust registers the native bridge. The service owns the queue and requests shared Rust playback resolution through a native channel, so background transitions do not require a running WebView. The shared player store mirrors native state.

Permissions are restricted to the Android main window. Only loopback HTTP URLs produced by the backend are accepted. The service is not exported and does not restart automatically after process termination. No broad storage permissions are requested.
