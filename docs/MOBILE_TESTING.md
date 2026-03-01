# Mobile testing (Android / iOS)

Use **`docker-manage.sh`** for both web and mobile. All commands from **project root**.

## Tools needed (no extras)

- **Android emulator:** **Android Studio** (includes the emulator; create a device in **Tools → Device Manager**).
- **iOS Simulator:** **Xcode** (includes the Simulator).  
No other tools are required.

---

## Alternatives when you can’t install Android Studio (e.g. company laptop)

Google does **not** offer Android Studio as an online/web app. You can still build and test without installing the full IDE:

| Option | What you need | How it works |
|-------|----------------|--------------|
| **1. CI-built APK** | GitHub (or other CI); a physical Android device or cloud emulator | Push your code; CI builds the APK (see below). Download the APK from the workflow run, install on your phone or upload to a cloud testing service. No Android Studio on your laptop. |
| **2. Command-line build only** | Android command-line tools (smaller than full IDE) | Install only [Android SDK command-line tools](https://developer.android.com/studio#command-tools). From project: `cd frontend && npm run cap:sync` then `cd android && ./gradlew assembleDebug`. APK is in `app/build/outputs/apk/debug/`. Install on a physical device. No emulator on the laptop. |
| **3. Cloud emulator (after you have an APK)** | APK from CI or command-line build | Use [BrowserStack App Live](https://www.browserstack.com/app-live), [LambdaTest](https://www.lambdatest.com/), or similar: upload the APK and test on real or virtual devices in the browser. Good for “no install on my machine.” |
| **4. Cloud IDE (full dev in browser)** | Gitpod, GitHub Codespaces, or similar | Open the repo in a cloud workspace, install Node + Android SDK (or Android Studio) there, and run the emulator in the cloud. Heavier and may need a paid plan for smooth emulator use. |

**Recommended if you can’t use Android Studio locally:** Use the CI-built APK and iOS app from the unified workflow (see “Validate and build in CI/CD” below).

## One build = Docker + mobile app

Running **`./infra/scripts/docker-manage.sh build`** (with no service name) updates both:

1. **Docker images** (backend, frontend)
2. **Mobile app** – runs `cap:sync` so the Android and iOS projects get the latest web build (API URL defaults to Android emulator: `http://10.0.2.2:8000/api`).  
   After that, open **Android Studio** or **Xcode** and run on the emulator/simulator. For **iOS Simulator**, run `./infra/scripts/docker-manage.sh ios` once to re-sync with `http://localhost:8000/api`.

So each full build keeps Docker and the simulator app in sync.

---

## 1. Backend must be running

Start the dev stack so the API is available (emulator uses `http://10.0.2.2:8000/api` to reach your host):

```bash
./infra/scripts/docker-manage.sh dev
```

Confirm API: open http://localhost:8000/api in a browser (should return JSON).

---

## 2. Android emulator

1. **Sync and open Android Studio**
   ```bash
   ./infra/scripts/docker-manage.sh android
   ```
   If you see `npm: command not found`, use a terminal where Node/npm is available (e.g. open a new terminal and run `nvm use` or `fnm use` if you use nvm/fnm), or install Node from https://nodejs.org. Then run the command again.

2. **In Android Studio:** choose an **Android Virtual Device** (e.g. Pixel 6, API 34) from the device dropdown, then click **Run** (green play). The app installs and launches on the emulator.

3. **Build APK for a physical device (later)**  
   In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.  
   APK path: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`. Copy to your phone and install, or run with a USB-connected device selected and click Run.

---

## 3. iOS Simulator

1. **Sync and open Xcode**
   ```bash
   ./infra/scripts/docker-manage.sh ios
   ```
   Same as Android: if `npm` is not found, use a terminal where `npm` works or install Node.

2. **In Xcode:** choose an **iPhone Simulator** (e.g. iPhone 15) from the scheme/device dropdown, then click **Run**. The app runs in the simulator.

3. **First-time iOS:** if the build fails with CocoaPods errors, run:
   ```bash
   cd frontend/ios/App && pod install && cd ../../..
   ```
   Then run `./infra/scripts/docker-manage.sh ios` again.

4. **IPA for a physical device (later)**  
   In Xcode: select your **iPhone** as the run destination, then **Product → Archive**. Use the Archive to distribute (e.g. TestFlight or Ad Hoc).

---

## API URL summary

| Where you run the app   | REACT_APP_API_URL (default used by script) |
|-------------------------|--------------------------------------------|
| Android emulator        | `http://10.0.2.2:8000/api`                 |
| iOS Simulator           | `http://localhost:8000/api`               |
| Physical device (Wi‑Fi)  | Set before running: `REACT_APP_API_URL=http://YOUR_MACHINE_IP:8000/api ./infra/scripts/docker-manage.sh android` (or `ios`) |

For **store builds**, use your deployed backend URL (HTTPS), not localhost or 10.0.2.2.

---

## Validate and build in CI/CD (no extra tools)

One pipeline validates and builds both Android and iOS so you can gate releases and reuse it anywhere.

- **Workflow:** `.github/workflows/mobile-build.yml` — **Validate and build mobile**
- **Runs on:** Push to `main`, or manually: **Actions → Validate and build mobile → Run workflow**
- **Steps:**
  1. **Validate** — Sanity tests, frontend unit tests, Docker Compose config. Must pass before any build.
  2. **Android APK** — Builds a debug APK; uploads artifact `app-debug-apk`.
  3. **iOS** — Builds the app for the iOS Simulator; uploads artifact `app-ios-simulator` (`.app` bundle).

Before releasing a version, run this workflow (or let it run on push to `main`). If validate or either build fails, fix before release. Set the repo variable **`REACT_APP_API_URL`** (e.g. to your deployed API) so the built app uses the correct backend.

---

## Test APK and iOS without installing tools

After the workflow finishes:

| Platform | Artifact | How to test (no Android Studio / Xcode) |
|----------|----------|----------------------------------------|
| **Android** | `app-debug-apk` (`.apk`) | Download from the Actions run → install on a physical device (copy via cloud/USB), or upload to [BrowserStack App Live](https://www.browserstack.com/app-live) / [LambdaTest](https://www.lambdatest.com/) and test in the browser. |
| **iOS** | `app-ios-simulator` (`.app`) | Simulator build: use on a Mac with Xcode (run in Simulator). For **device testing without a Mac**: upload a **signed IPA** to [BrowserStack](https://www.browserstack.com/app-live) (they support iOS); to get an IPA you must add code signing to the workflow (see below). |

---

## IPA for iOS device (signed build)

The workflow currently produces an **iOS Simulator** `.app` (validates that the iOS project builds). To get an **IPA for a physical device** (or TestFlight):

1. In your Apple Developer account, create a distribution certificate and provisioning profile (or use development + ad hoc).
2. Store in GitHub Secrets (e.g. base64-encoded certificate, profile, and keychain password).
3. Add a job (or steps) in `mobile-build.yml` that installs the certificate, runs `xcodebuild archive`, then `xcodebuild -exportArchive` to produce an `.ipa`, and upload it as an artifact.

Until that is set up, use the simulator artifact for CI validation and build signed IPAs locally in Xcode (**Product → Archive**) when you need a device build.

---

## Deploy to Docker Desktop, then push and test APK/iOS

1. **Deploy locally and smoke-test**
   ```bash
   ./infra/scripts/docker-manage.sh dev
   ```
   Open http://localhost:3000 and http://localhost:8000/api; confirm the app and API work.

2. **Commit and push**
   ```bash
   git add .
   git commit -m "Your message"
   git push origin main
   ```

3. **Run the mobile pipeline**
   - The workflow runs automatically on push to `main`, or go to **Actions → Validate and build mobile → Run workflow**.
   - Wait for **Validate**, **Android APK**, and **iOS** jobs to complete.

4. **Download and test**
   - Open the completed run → **Artifacts**.
   - Download **app-debug-apk** → install on an Android device or upload to BrowserStack/LambdaTest.
   - Download **app-ios-simulator** → on a Mac, open in Xcode/Simulator, or use a signed IPA flow for device (see above).
