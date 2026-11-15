fn main() {
    tauri_plugin::Builder::new(&[
        "lyrics",
        "play",
        "queue",
        "control",
        "snapshot",
        "register_listener",
        "remove_listener",
    ])
    .android_path("android")
    .build();
}
