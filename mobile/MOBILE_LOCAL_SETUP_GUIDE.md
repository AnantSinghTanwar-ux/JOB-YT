# Jobyt Mobile Application — Local Setup Guide

Complete guide for setting up and running the Jobyt React Native (Expo) mobile application locally on Android emulator.

---

## 1. Required Software

| Software              | Version / Notes                                      |
| --------------------- | ---------------------------------------------------- |
| **Node.js**           | v20+ (LTS recommended)                               |
| **npm**               | v10+ (bundled with Node.js)                           |
| **Android Studio**    | Latest stable (Ladybug or later)                      |
| **Android SDK**       | API Level 34+ via SDK Manager                        |
| **Java JDK**          | 17+ (bundled with Android Studio)                    |
| **Expo CLI**          | Installed globally or via `npx`                      |
| **Ollama**            | Latest (for local AI fallback)                       |
| **Git**               | Latest                                               |
| **PostgreSQL**        | 14+ (for backend database)                           |

---

## 2. Android Studio Setup

1. Download and install [Android Studio](https://developer.android.com/studio).
2. During setup, ensure **Android SDK**, **Android SDK Platform-Tools**, and **Android Emulator** are selected.
3. Open **SDK Manager** → **SDK Platforms**:
   - Install **Android 14 (API 34)** or later.
4. Open **SDK Manager** → **SDK Tools**:
   - Install **Android SDK Build-Tools**.
   - Install **Android Emulator**.
   - Install **Android SDK Platform-Tools**.

---

## 3. Emulator Setup

1. Open **Android Studio** → **Device Manager** (or **Virtual Device Manager**).
2. Click **Create Device**.
3. Select **Pixel 8** (or another device with Google Play APIs).
4. Select system image: **API 34** (with Google APIs).
5. Configure device settings:
   - RAM: **4096 MB** recommended.
   - Internal Storage: **4096 MB** recommended.
6. Click **Finish** and **Launch** the emulator.

### Start Emulator via CLI (Alternative)

```bash
# List available emulators
emulator -list-avds

# Start emulator
emulator -avd Pixel_8_API_34
```

---

## 4. Ollama Setup

Ollama is used as an AI provider fallback for local development.

1. Download and install [Ollama](https://ollama.com/download).
2. Pull the required model:

```bash
ollama pull llama3.1:8b
```

3. Verify Ollama is running:

```bash
ollama list
# Should show llama3.1:8b
```

4. Ollama runs on `http://localhost:11434` by default.

---

## 5. Environment Variables

### Backend (`backend/.env`)

Key variables:

```env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/hiring_platform
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# AI Providers
GROQ_API_KEY=your-groq-api-key
OLLAMA_BASE_URL=http://localhost:11434

# Cloudinary (for PDF uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Mobile (`mobile/.env`)

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5001/api/v1
EXPO_PUBLIC_APP_NAME=Jobyt
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_AI_PROVIDER=AI
EXPO_PUBLIC_FALLBACK_PROVIDER=OLLAMA
```

> **Note**: `10.0.2.2` is the Android emulator's alias for `localhost` on the host machine. Do NOT use `localhost` or `127.0.0.1` — those resolve to the emulator's own loopback.

---

## 6. Backend Startup

```bash
cd backend

# Install dependencies
npm install

# Run database migrations (if needed)
# npm run migrate

# Start development server
npm run dev
```

Backend runs at: `http://localhost:5001`
API prefix: `http://localhost:5001/api/v1`

### Verify Backend

```bash
curl http://localhost:5001/api/v1/health
# Should return: { "status": "ok" }
```

---

## 7. Frontend Startup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:3001`

---

## 8. Mobile Startup

```bash
cd mobile

# Install dependencies
npm install

# Start Expo development server with Android
npx expo start --android

# Or start with cache clear
npx expo start --android --clear
```

The Expo dev server starts Metro bundler, builds the JavaScript bundle, and installs Expo Go on the emulator automatically.

---

## 9. Expo Commands

| Command                            | Purpose                              |
| ---------------------------------- | ------------------------------------ |
| `npx expo start`                   | Start Metro bundler                  |
| `npx expo start --android`         | Start and open on Android emulator   |
| `npx expo start --android --clear` | Start with cache cleared             |
| `npx expo start --web`             | Start web version                    |
| `npx expo install <package>`       | Install Expo-compatible package      |
| `npx tsc --noEmit`                 | Run TypeScript type-check            |
| `npx expo prebuild`                | Generate native projects             |
| `npx expo run:android`             | Build and run native Android project |

### In-Terminal Controls (while Metro is running)

| Key | Action                |
| --- | --------------------- |
| `r` | Reload the app        |
| `m` | Toggle menu           |
| `j` | Open debugger         |
| `a` | Open on Android       |
| `w` | Open on web           |

---

## 10. Android Emulator Commands

```bash
# List available AVDs
emulator -list-avds

# Start a specific emulator
emulator -avd Pixel_8_API_34

# Start emulator without snapshot (cold boot)
emulator -avd Pixel_8_API_34 -no-snapshot-load
```

---

## 11. ADB Commands

```bash
# Check connected devices
adb devices

# Take screenshot
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png ./screen.png

# Dump UI hierarchy (for debugging)
adb shell uiautomator dump /sdcard/window_dump.xml
adb pull /sdcard/window_dump.xml ./window_dump.xml

# View logs (React Native)
adb logcat -s ReactNativeJS

# View all logs
adb logcat

# Install APK
adb install path/to/app.apk

# Reverse port forwarding (if needed)
adb reverse tcp:5001 tcp:5001

# Clear app data
adb shell pm clear com.jobyt.mobile
```

> **Note**: If `adb` is not in PATH, use the full path:
> `C:\Users\<USER>\AppData\Local\Android\Sdk\platform-tools\adb.exe`

---

## 12. Testing Workflow

### Pre-Test Checklist

1. ✅ Android emulator is running (`adb devices` shows `emulator-5554`)
2. ✅ Backend is running at `http://localhost:5001`
3. ✅ Ollama is running with `llama3.1:8b` model
4. ✅ Mobile `.env` has `EXPO_PUBLIC_API_URL=http://10.0.2.2:5001/api/v1`
5. ✅ Expo Metro bundler is running

### Test Flow

1. **Authentication** (MOB-U1)
   - Login with test credentials: `john@example.com` / `Applicant@123`
   - Test registration with new email
   - Test forgot password flow
   - Verify token persistence (kill and reopen app)
   - Test logout

2. **Job Discovery** (MOB-U2)
   - Browse jobs on Home and Jobs tabs
   - Search and filter
   - View job details
   - Apply to a job
   - Bookmark/save jobs

3. **Push Notifications** (MOB-U3)
   - Toggle push notifications in Profile settings
   - Verify mock token registration on emulator

4. **Biometric Auth** (MOB-U4)
   - Enable biometric unlock in Profile settings
   - Background/foreground the app to trigger lock screen

5. **Offline Mode** (MOB-U5)
   - Toggle airplane mode on emulator
   - Verify offline banner appears
   - Browse cached jobs/applications
   - Reconnect and verify sync

6. **AI Mock Interview** (MOB-U6)
   - Navigate to Career Coach → AI Mock Interview
   - Start a new interview session
   - Answer questions and view AI evaluation
   - Complete interview and view report

7. **AI Career Coach** (MOB-U7)
   - ATS Resume Matcher
   - Skill Gap Analysis
   - Resume upload

8. **Build Readiness** (MOB-U8)
   - Run `npx tsc --noEmit` (zero errors)
   - Verify `app.json` and `eas.json` configurations

9. **UI/UX Review** (MOB-U9)
   - Verify dark theme consistency
   - Check responsive layouts
   - Verify animations and transitions

### TypeScript Verification

```bash
cd mobile
npx tsc --noEmit
# Expected: 0 errors
```

---

## 13. Common Troubleshooting

### "Network Error" / "Request failed"
- Ensure backend is running at `http://localhost:5001`
- Verify mobile `.env` uses `http://10.0.2.2:5001/api/v1` (not `localhost`)
- Run `adb reverse tcp:5001 tcp:5001` if needed

### "Objects are not valid as a React child"
- This indicates an object is being rendered directly in JSX
- Check that data from API responses (especially JSONB fields like `ai_feedback`) is converted to strings before rendering
- Use defensive rendering patterns: `typeof data === 'string' ? data : JSON.stringify(data)`

### Metro Bundler Not Connecting
- Press `r` in the Metro terminal to reload
- Run `npx expo start --android --clear` to clear cache
- Check that emulator has internet access

### Expo Go Crashes on Launch
- Clear Expo Go app data: `adb shell pm clear host.exp.exponent`
- Reinstall: Metro will auto-install on next `npx expo start --android`

### Push Notification 404 Error
- Expected on emulators without real push token support
- The app gracefully falls back to mock tokens for local testing
- Real push tokens require a physical device with Google Play Services

### Emulator Won't Start
- Check available disk space (emulator requires ~8GB+)
- Cold boot: `emulator -avd <name> -no-snapshot-load`
- Ensure HAXM/Hypervisor is enabled in BIOS

### TypeScript Errors
- Run `npx tsc --noEmit` to check
- Ensure all dependencies are installed: `npm install`
- Check `tsconfig.json` for correct settings

---

## Quick Start (TL;DR)

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Emulator (if not already running)
emulator -avd Pixel_8_API_34

# Terminal 3: Mobile
cd mobile && npx expo start --android --clear
```

Test login: `john@example.com` / `Applicant@123`
