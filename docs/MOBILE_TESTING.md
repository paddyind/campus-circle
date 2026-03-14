# Mobile Testing – APK and iPad on Same WiFi

Test Campus Circle on Android and iPad devices on the same WiFi as your development machine.

## Prerequisites

- **Android**: Android Studio (for first-time setup); Java/JDK; `adb` for installing APK
- **iOS**: Mac with Xcode; Apple Developer account for physical device
- **Backend**: Docker stack or backend running on port 8000
- **Same WiFi**: Machine, Android device, and iPad on the same network

## 1. Start the backend (Docker)

```bash
./infra/scripts/docker-manage.sh run
```

- Web app: http://localhost:3000  
- Backend API: http://localhost:8000  

## 2. Build Android APK (same-WiFi)

The script auto-detects your machine’s LAN IP so the app can reach the backend.

```bash
./infra/scripts/docker-manage.sh apk
```

Output APK path:
`frontend/android/app/build/outputs/apk/debug/app-debug.apk`

### Manual API URL

If auto-detection fails, set `REACT_APP_API_URL`:

```bash
REACT_APP_API_URL=http://192.168.1.10:8000/api ./infra/scripts/docker-manage.sh apk
```

Replace `192.168.1.10` with your Mac’s LAN IP: System Settings → Network → Wi‑Fi → your IP.

### Install on Android

1. Enable USB debugging on the Android device.
2. Connect via USB and install:

   ```bash
   adb install -r frontend/android/app/build/outputs/apk/debug/app-debug.apk
   ```

3. Or copy the APK to the device and open it there.

## 3. Build for iPad (same-WiFi)

1. Use your Mac’s LAN IP for `REACT_APP_API_URL`:

   ```bash
   REACT_APP_API_URL=http://192.168.1.10:8000/api ./infra/scripts/docker-manage.sh ios
   ```

2. Xcode opens. Choose your physical iPad as the run target.
3. Sign with your Apple Developer account (or team).
4. Build and run on the iPad.

## 4. Check backend logs (calendar import)

Calendar import debug logs are written to the backend container, not the UI.

```bash
./infra/scripts/docker-manage.sh logs backend
```

In another terminal, trigger an import. Logs appear in the backend container output.
