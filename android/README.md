# Freezerino for Android

A native Android app, written in Kotlin with Jetpack Compose. It uses the same Firebase project and data as the
website, so changes on one show up on the other right away. The iPhones keep using the website.

- Package: `com.nkoindustries.freezerino`. Publisher: NKO Industries.
- Firebase: Auth (the shared family account), Firestore (works offline, keeps a copy on the phone), and Cloud
  Messaging (expiry notifications from the daily GitHub job, shown by `PushService`).
- It has every feature of the website: two freezers, the freezer maps, dated packages, expiry colours and the alert
  box, search and the category filter, autocomplete, the shopping list (automatic items, Guardar, WhatsApp), history,
  shelves, and notifications.

## Code

- `data/Model.kt`: Firestore documents, expiry rules, dates.
- `data/Store.kt`: live data, all writes, the shopping list logic, history, and push registration.
- `data/Categories.kt`: food categories and suggested freezer times.
- `data/FoodData.kt`: **generated** from the website's `categories.js` and `foods.js`. After changing those files, run
  `python android/tools/gen_data.py` from the repo root.
- `ui/`: screens (`FreezerScreen`, `Tabs`) and bottom sheets (`ItemSheet`, `Sheets`).

## Firebase setup (one time)

In the Firebase console, add an Android app with the package name `com.nkoindustries.freezerino`. Download
`google-services.json` and put it in `android/app/`. The file is git-ignored. Without it the app still logs in and
syncs (it uses the web app's IDs), but notifications don't work.

## Build

```bash
cd android
JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleRelease
```

The APK is written to `app/build/outputs/apk/release/app-release.apk`.

Signing: `key.properties` (git-ignored) points to the upload key at `C:/Users/Maulem/.android-keys/freezerino.jks`.
A copy of `key.properties` sits next to the key. **Back up both files.** Without them, updates can't be installed over
the existing app.
