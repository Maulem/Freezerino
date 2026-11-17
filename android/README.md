# Freezerino for Android

A Trusted Web Activity (TWA): a small Android app that opens https://maulem.github.io/Freezerino/ full screen in
Chrome. It's the same site, so updates to the web app reach the Android app with nothing to reinstall. Notifications
(web push through Chrome, shown under the app's name), offline mode, login and the daily backup all keep working.

- Package: `com.nkoindustries.freezerino`, publisher NKO Industries.
- Library: `com.google.androidbrowserhelper:androidbrowserhelper`.

## Build

```bash
cd android
JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleRelease
```

The APK ends up in `app/build/outputs/apk/release/app-release.apk`.

Signing: `key.properties` (git-ignored) points to the upload key at `C:/Users/Maulem/.android-keys/freezerino.jks`.
A copy of key.properties is next to the key. **Back up both files.** Without them, an update can't be installed over
the existing app.

## Hide the address bar (Digital Asset Links)

Android shows the app full screen only after the site confirms the app belongs to it. It checks this file:
`https://maulem.github.io/.well-known/assetlinks.json`. That path is at the root of the domain, so it has to live
in a repo called `maulem.github.io`, not in this one:

1. On GitHub, create a public repo named exactly `maulem.github.io`.
2. Add `assetlinks/assetlinks.json` from this folder as `.well-known/assetlinks.json`.
3. Add an empty `.nojekyll` file so GitHub Pages also publishes the `.well-known` folder.
4. Pages turns on by itself for that repo. Wait a minute, then reopen the app.

Until then the app works, with a thin address bar at the top.

The fingerprint in assetlinks.json belongs to the upload key above. If the app is ever published on Google Play,
add Play's app-signing fingerprint as a second entry.
