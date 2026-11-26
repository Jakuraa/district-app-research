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

## Diagnostic Update (2026-11-26T19:14+05:30)

- `adb devices -l` (and REA `list_adb_devices` / `ev_e9d022a2...`): **Empty device list** — USB device not reaching ADB.
- `system_profiler SPUSBDataType`: No Android phone or USB debugging interface enumerated on the host USB buses (only USB 3.0 Hub card reader/LAN, USB 2.0 Hub keyboard/mouse/billboard, Apple T2 bus).
- `npx expo-doctor` on `implementation/android` (15/18 passed, 3 failed):
  1. Missing peer dependencies `expo-constants` and `expo-linking` required by `expo-router` (Expo warns: *"Your app may crash outside of Expo Go without these dependencies"*).
  2. `app.json` field `android.edgeToEdgeEnabled` is not allowed in Expo SDK 52 schema.
  3. `react-native@0.76.6` vs expected `0.76.9` for installed Expo SDK 52.
- Physical device logcat capture and District APK inspection remain blocked until an authorized Android phone is connected via a data-capable USB cable in File Transfer + USB Debugging mode.
