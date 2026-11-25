# Android Research Environment & Status

## Tooling Readiness (Verified 2026-11-26)

- **JDK**: Eclipse Temurin OpenJDK `21.0.13.1` (`JAVA_HOME=$HOME/.local/share/jdk/jdk-21.0.13.1+2/Contents/Home`)
- **JADX Headless MCP**: `$HOME/.local/share/rea/android/jadx-headless-mcp-0.8.0-all.jar`
  - Verified SHA-256: `4b9a01c23845c123c217840182d2b5f2c26a7ca20dec3d08810b310fc80a2372`
  - REA `doctor --client antigravity --provider jadx --json`: `healthy: true`
- **ADB**: Android Debug Bridge `1.0.41` (Platform-Tools `37.0.1-15733141`) at `/usr/local/bin/adb`
- **Apktool**: `3.0.3` at `$HOME/.local/bin/apktool`

## Connected Device Status

- `adb devices -l`: **No devices or emulators attached** as of `2026-11-26`.

## Tasks Awaiting an Authorized Android Device

1. Connect an authorized physical Android device (with USB debugging enabled) or launch an Android emulator, then verify `adb devices -l` shows `device`.
2. Locate the installed official District package via `rea resolve-adb-packages` / `adb shell pm list packages`.
3. Pull the user's own installed base/split APKs into `local-artifacts/apk/` (gitignored) and compute SHA-256 digests.
4. Run REA static inspection (`inspect_android_package`, `decode_android_resources`, `search_android_classes`) to document manifest activities, deep links, permissions, and native navigation patterns.
5. Observe Android-specific mobile UX (bottom navigation, hardware back behaviour, native bottom sheets, TalkBack labels).
