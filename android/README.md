# Rezumate Android

Native Kotlin and Jetpack Compose port of the current iOS application.

## Build

Use Android Studio's bundled JDK 17 or newer:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew test lint assembleDebug
```

The debug APK is written to `app/build/outputs/apk/debug/app-debug.apk`.

## Payment Configuration

Real purchases remain locked until the payment backend verifies and acknowledges them. Production
defaults point to project `rezumate-android-pay-2026`; private Gradle properties or CI variables can
override them for another environment:

```properties
PAYMENT_BACKEND_URL=https://YOUR_CLOUD_RUN_HOST/v1/google-play/purchases/verify
PLAY_CLOUD_PROJECT_NUMBER=123456789012
```

The Google Play application must use package `com.aftaab.rezumate`, and the active one-time product
must be `rezumate_pro_lifetime`. Follow `../payments/README.md` to deploy the acknowledgement
backend, configure Play Integrity, and connect Real-time Developer Notifications before testing a
real purchase.

Never ship a build with an empty payment backend URL or project number `0`. The locked behavior in
that configuration is intentional so an unacknowledged purchase cannot be mistaken for Pro access.

Configure the Play upload key through private Gradle properties or CI secrets:

```properties
RELEASE_STORE_FILE=/absolute/path/to/rezumate-upload.jks
RELEASE_STORE_PASSWORD=...
RELEASE_KEY_ALIAS=rezumate-upload
RELEASE_KEY_PASSWORD=...
```

Without all four signing values, `bundleRelease` intentionally produces an unsigned bundle.
The local developer key is stored at `~/.android/rezumate-upload.jks`; its password is stored in
macOS Keychain under service `com.aftaab.rezumate.upload-keystore`, not in this repository.

## Release Checklist

- Deploy the payment backend and verify `/healthz`.
- Configure Play App Signing and add its certificate digest to the backend.
- Activate `rezumate_pro_lifetime` in Play Console.
- Upload an Android App Bundle to an internal test track.
- Complete a license-tester purchase and confirm backend status is `PURCHASED_ACKNOWLEDGED`.
- Kill the app immediately after a second test purchase and confirm RTDN still acknowledges it.
- Verify restore after reinstall with the same Google account.
- Confirm no purchased test token remains unacknowledged.
