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

## Why APIs / login fail on a physical device (and how to fix it)

The app talks to your **FastAPI backend** using a URL that is **baked in at build time** (`REACT_APP_API_URL`). If you install an APK or IPA that was built with a placeholder or unreachable URL, only static content works; all API calls and login will fail.

- **CI-built APK/IPA** uses the repo variable `REACT_APP_API_URL` or the default `https://your-api.com/api` (a placeholder). Your phone cannot reach that, so APIs fail.
- **Docker Desktop** runs only on your computer. The phone cannot use `localhost` or your machine’s hostname unless you use one of the two approaches below.

You have two ways to get a working app on your phone (same for **Android and iOS**):

---

### Option 1: Same WiFi – no public hosting

Use this for quick testing at home/office when your phone and computer are on the same network.

#### If you build APK/IPA only in GitHub Actions (no Android SDK / Xcode locally)

You can still test with your local backend on the same WiFi by having GHA build the app with your machine’s IP.

1. **Run the backend on your machine**
   ```bash
   ./infra/scripts/docker-manage.sh dev
   ```
   Check the API in a browser: http://localhost:8000/api (should return JSON).

2. **Find your computer’s LAN IP**
   - **Mac:** System Settings → Network → Wi‑Fi → Details (or run `ipconfig getifaddr en0` in Terminal).
   - **Windows:** `ipconfig` and look for IPv4 Address under your Wi‑Fi adapter.
   - Example: `192.168.1.10`

3. **Trigger a mobile build with that URL**
   - In GitHub: go to **Actions**. In the **left sidebar**, click the workflow **"Validate and build mobile"** (not "CI").
   - You should see a **"Run workflow"** dropdown on the right. **Click the dropdown** (the part that says "Run workflow") to expand it — the **"API URL for the app"** input field appears there.
   - Enter: `http://YOUR_LAN_IP:8000/api` (e.g. `http://192.168.1.10:8000/api`). Leave it empty to use the repo variable or default.
   - Choose the branch (e.g. `main`), then click the green **Run workflow** button.
   - **If you don't see the "API URL for the app" field:** (1) Scroll down inside the "Run workflow" dropdown — the field can appear below the branch selector. (2) Confirm `.github/workflows/mobile-build.yml` on the **main** branch (on GitHub → Code) contains an `inputs:` block under `workflow_dispatch`; if not, commit and push the workflow file. (3) **Workaround:** set the repo variable **REACT_APP_API_URL** (Settings → Secrets and variables → Actions → Variables) to your URL (e.g. `http://YOUR_LAN_IP:8000/api`) and run the workflow with the dropdown left as-is; the workflow uses that variable when the input is empty.

4. **Download and install**
   - Open the completed run → **Artifacts**.
   - Download **app-debug-apk** → copy the APK to your Android phone (e.g. via cloud or USB) and install.
   - For iOS: download **app-ios-simulator** (simulator) or use a signed IPA if you have that set up; install on your iPhone.

5. **Connect phone to the same WiFi** as your computer and allow port **8000** in your machine’s firewall if needed. Then open the app on the phone; login and APIs should hit your local backend.

If your LAN IP changes (e.g. new network), repeat from step 2 and run the workflow again with the new IP so the app points to the right host.

#### If you build APK/IPA locally (Android Studio / Xcode)

1. **Run the backend on your machine**
   ```bash
   ./infra/scripts/docker-manage.sh dev
   ```
2. **Find your computer’s LAN IP** (e.g. `192.168.1.10`).
3. **Build the app with that URL:**
   ```bash
   # Android
   REACT_APP_API_URL=http://YOUR_LAN_IP:8000/api ./infra/scripts/docker-manage.sh android
   ```
   Then in Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**. Install the APK on your phone (same WiFi).
   ```bash
   # iOS
   REACT_APP_API_URL=http://YOUR_LAN_IP:8000/api ./infra/scripts/docker-manage.sh ios
   ```
   In Xcode, select your iPhone and run, or **Product → Archive** to create an IPA.
4. **Allow inbound connections** on your machine (e.g. port 8000). Phone and computer must be on the same WiFi.

No need for Firebase or any public hosting for this option.

---

### Option 2: Public backend – works anywhere (recommended for real use)

To use the app on your phone (or share with others) without being on the same WiFi, the backend must be reachable on the internet. **Docker Desktop is local only**; you need to deploy the API to a public host.

1. **Host the FastAPI backend** (not the static app) on a cloud provider. Examples:
   - [Railway](https://railway.app) – connect repo or deploy with Docker.
   - [Render](https://render.com) – Web Service from Docker or from source.
   - [Fly.io](https://fly.io) – deploy with Dockerfile.
   - Google Cloud Run, AWS, or a VPS – run your backend container there.

   Use the **same** `.env` (Supabase, DB, etc.) as in your project; set env vars in the host’s dashboard. You get a URL like `https://your-app.up.railway.app` (and your API might be at `https://your-app.up.railway.app/api` if you mount the app at `/api`).

2. **Point the app at that URL when building**
   - **CI (APK/IPA from GitHub Actions):** In the repo go to **Settings → Secrets and variables → Actions**, add (or edit) variable **`REACT_APP_API_URL`** = `https://your-backend.example.com/api` (your real backend URL with `/api`). The next CI run will build the app with this URL; download the APK or iOS artifact and install.
   - **Local build for Android:**  
     `REACT_APP_API_URL=https://your-backend.example.com/api ./infra/scripts/docker-manage.sh android`  
     Then build the APK in Android Studio and install on the device.
   - **Local build for iOS:**  
     `REACT_APP_API_URL=https://your-backend.example.com/api ./infra/scripts/docker-manage.sh ios`  
     Then in Xcode run on device or create an IPA via **Product → Archive**.

3. **CORS:** Your backend already allows origins from the app; when the app is loaded from `capacitor://localhost` or your production domain, ensure the deployed backend’s CORS settings include that origin (or use a broad dev allowlist for testing).

**Firebase:** Firebase is great for auth, Firestore, and hosting **static** sites. Your login and APIs are handled by the **FastAPI backend**, so you still need to host that backend somewhere (e.g. Railway, Render, Fly.io). You don’t have to use Firebase unless you later switch auth/data to Firebase.

---

### Summary (Android and iOS)

| Goal                         | What to do |
|-----------------------------|------------|
| Test on phone, same WiFi   | Run backend locally, build app with `REACT_APP_API_URL=http://YOUR_LAN_IP:8000/api`, install APK/IPA. |
| Test anywhere / production  | Deploy backend to Railway/Render/Fly.io (or similar), set `REACT_APP_API_URL` to that URL (e.g. in GitHub Actions variable), build APK/IPA and install. |

Same `REACT_APP_API_URL` and same flow apply to both **APK (Android)** and **IPA (iOS)**.

---

## Troubleshooting: "Failed to fetch" / "Error loading events"

When the app shows **"Error loading events: Failed to fetch"** or login fails with a network error, the app cannot reach the API. Use the steps below to confirm the URL and fix connectivity.

### 1. See which URL the app is using

The app now shows the **API URL** it was built with when an error occurs:

- **Events page:** When events fail to load, the error box shows **"Using API: …"** with the exact base URL.
- **Login page:** When login fails with a fetch/network error, the error box shows **"API: …"** with the same URL.

If that URL is `https://your-api.com/api` or `http://localhost:8000/api`, the build was made with a placeholder or local URL; your phone cannot reach it. Rebuild the app with the correct URL (see Option 1 or 2 above).

### 2. Check the backend is running and reachable

- **On your computer:** Open a browser and go to `http://YOUR_LAN_IP:8000/api` (e.g. `http://192.168.1.10:8000/api`). You should see a short JSON response (e.g. `{"status":"ok",...}`). If it fails, start the backend: `./infra/scripts/docker-manage.sh dev`.
- **From the phone (same WiFi):** On the phone’s browser, open the same URL (`http://YOUR_LAN_IP:8000/api`). If it loads, the backend is reachable from the device; if it doesn’t, the problem is network or firewall (see step 4).

### 3. Logs

- **Backend (Docker):** `docker logs campus-circle-backend` (or `./infra/scripts/docker-manage.sh logs backend`) to see API requests and errors. If you don’t see requests when the app retries, the request isn’t reaching the server (URL or network).
- **Mobile app:** There are no built-in in-app logs. Use the **"Using API: …"** text on the error screen to confirm the URL. For deeper debugging, you can run the app from Android Studio or Xcode and watch Logcat / Xcode console.

### 4. Checklist

| Check | What to do |
|-------|------------|
| URL in the app | Match the "Using API" value on the error screen to the URL you intended (e.g. `http://YOUR_LAN_IP:8000/api` for same-WiFi). If wrong, set **REACT_APP_API_URL** (repo variable or workflow input) and rebuild. |
| Backend running | Run `./infra/scripts/docker-manage.sh dev` and confirm `http://localhost:8000/api` works in a browser. |
| Same WiFi | Phone and computer must be on the same network for a LAN IP URL to work. |
| Firewall | Allow inbound TCP port **8000** on your computer so the phone can connect. |
| CORS | The backend allows `capacitor://localhost` and `http://192.168.x.x` in development; no change needed for normal device testing. |
| **Chrome works, app doesn't** | On Android, the app WebView blocks HTTP (cleartext) by default. The project enables `android:usesCleartextTraffic="true"` in `AndroidManifest.xml` so the app can reach `http://YOUR_IP:8000/api`. If you see "Failed to fetch" while the same URL works in the phone's browser, rebuild and reinstall the APK after this change. |

---

## Validate and build in CI/CD (no extra tools)

**One pipeline per push** — no duplicate runs. The main **CI** workflow runs on every push/PR to `main` and produces all artifacts.

- **Workflow:** `.github/workflows/ci.yml` — **CI**
- **Runs on:** Push and pull_request to `main`
- **Jobs (with dependency):**
  1. **Validate & Docker** — Sanity tests, Python/Node tests, Docker Compose config, Docker image build. Must pass first.
  2. **Android APK** — Runs only if job 1 passes; uploads artifact `app-debug-apk`.
  3. **iOS (Simulator .app)** — Runs only if job 1 passes; uploads artifact `app-ios-simulator`.

So one run per push: validate and Docker build first, then Android and iOS build in parallel. Set the repo variable **`REACT_APP_API_URL`** so the built app uses the correct backend.

**Optional:** **Validate and build mobile** (`.github/workflows/mobile-build.yml`) runs only when you trigger it manually (Actions → select **Validate and build mobile** in the left sidebar, then click the **Run workflow** dropdown to see the **API URL for the app** field). When you run it, enter your URL there (e.g. for same-WiFi) or leave empty to use the repo variable. If you don't see the field, you're likely on the **CI** workflow (which runs on push and has no input); select **Validate and build mobile** and expand the dropdown. When you run it, you can optionally enter **API URL for the app** (e.g. `http://YOUR_LAN_IP:8000/api` for same-WiFi testing with your local backend); see “Option 1: Same WiFi” above.

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
