<p align="center">
  <img src="public/app-icon.png" width="112" height="112" alt="BiliMusic 图标">
</p>

<h1 align="center">BiliMusic</h1>

<p align="center">
  让 B 站成为你的音乐库。<br>
  音乐、有声书与长音频，在电脑、手机和大屏之间延续。
</p>

<p align="center">
  <a href="https://github.com/licpp/BiliMusic-Desktop/releases"><img src="https://img.shields.io/github/v/release/licpp/BiliMusic-Desktop?color=087f8c&label=release" alt="最新正式版本"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-087f8c" alt="MIT License"></a>
  <a href="https://bilimusic.cn"><img src="https://img.shields.io/badge/website-bilimusic.cn-087f8c" alt="BiliMusic 官网"></a>
</p>

<p align="center">
  <a href="#下载">下载安装</a> ·
  <a href="#功能">功能介绍</a> ·
  <a href="https://bilimusic.cn/#changelog">更新日志</a> ·
  <a href="https://github.com/licpp/BiliMusic-Desktop/issues">问题反馈</a>
</p>

![BiliMusic 桌面端界面](docs/screenshots/bilimusic-desktop.png)

## 下载

[**官网下载**](https://bilimusic.cn/#download) · [**GitHub Releases**](https://github.com/licpp/BiliMusic-Desktop/releases) · [**Gitee 国内镜像**](https://gitee.com/yoaker/BiliMusic-Desktop/releases)

| 平台 | 安装包 | 系统与架构 |
| --- | --- | --- |
| macOS | DMG | macOS 12+ · Apple Silicon |
| Windows | 安装程序 | Windows 10 / 11 · x64 |
| Android | APK | Android 8+ · ARM64 |
| iOS / iPadOS | 自签 IPA | iOS / iPadOS 15+ · ARM64 |
| HarmonyOS NEXT | 未签名 HAP 测试包 | HarmonyOS 6.0+ · ARM64 |
| 车机 / TV | 独立大屏 APK | Android 8+ · ARM64 · 触控 / 遥控器 |

[iOS 自签安装](https://bilimusic.cn/ios.html) · [鸿蒙签名与安装](https://bilimusic.cn/harmony.html)

**0.3.5 正在测试**：改进标题识别、歌词匹配与跨端同步，并加入应用内更新。正式安装包以 Releases 为准。

## 功能

- **把内容整理成音乐库**：搜索 B 站视频与 UP 主，收藏歌曲、合集和分 P，整理歌单、文件夹与关注列表。
- **带上已有歌单**：粘贴网易云、QQ 音乐、酷狗、酷我、咪咕的歌单链接，或导入歌曲列表，匹配 B 站资源。
- **跟着歌词听**：自动匹配歌词，显示逐字进度、翻译和音译；也能使用 B 站字幕、调整歌词时间。
- **按自己的习惯播放**：管理播放队列、切换音质、离线下载、倍速与断点续播，按需打开视频和弹幕。
- **在设备之间延续**：通过坚果云同步歌单、收藏与歌词设置，汇总同一账号的听歌时长、常听歌曲和热力日历。
- **适合不同的屏幕**：电脑提供桌面歌词、迷你播放器与自定义快捷键；手机支持后台播放和系统媒体控制；车机 / TV 使用适合触控与遥控器的大屏界面。

## 开发与贡献

BiliMusic 使用 **React、TypeScript、Rust、Tauri 与 SQLite**，各端共享业务逻辑，分别对接系统播放器和桌面能力。

```sh
npm ci
npm run tauri dev
```

各平台环境、构建和测试步骤见 [开发指南](docs/DEVELOPMENT.md)。欢迎提交 [Issue](https://github.com/licpp/BiliMusic-Desktop/issues) 与 [Pull Request](https://github.com/licpp/BiliMusic-Desktop/pulls)。

## 开源许可

采用 [MIT License](LICENSE)。第三方代码与依赖见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

BiliMusic 是独立开源项目，与哔哩哔哩无隶属关系。[使用声明](DISCLAIMER.md) · [代码来源说明](CLEAN_ROOM.md)
