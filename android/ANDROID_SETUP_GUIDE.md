# Android App Setup Guide

## Prerequisites
- Android Studio 2023.x or later
- Android SDK 34+ (compileSdk)
- Min SDK 24 (API 24 - Android 7.0)
- Kotlin 1.9.22+
- Java 1.8 or higher

## Project Structure

```
android/
├── app/
│   ├── build.gradle                 # App dependencies & build config
│   ├── src/
│   │   └── main/
│   │       ├── AndroidManifest.xml  # Activity declarations
│   │       ├── java/com/example/peertopeer/
│   │       │   ├── data/            # Models, API, Repository
│   │       │   │   ├── model/
│   │       │   │   ├── network/
│   │       │   │   └── repository/
│   │       │   └── ui/              # Activities & ViewModels
│   │       │       ├── splash/
│   │       │       ├── dashboard/
│   │       │       ├── risk/
│   │       │       ├── dispute/
│   │       │       └── admin/
│   │       └── res/                 # XML layouts, colors, styles
│   │           ├── layout/
│   │           └── values/
│   └── build.gradle                 # Project-level config
└── settings.gradle
```

## Setup Instructions

### 1. Import Project into Android Studio
1. Open Android Studio
2. Click **File → Open**
3. Navigate to this `android/` folder
4. Click **Open**
5. Wait for Gradle sync to complete

### 2. Configure API Endpoint
Update `ApiClient.kt` with your backend URL:

```kotlin
// For emulator (localhost access from emulator)
private const val BASE_URL = "http://10.0.2.2:5000/"

// For physical device
private const val BASE_URL = "http://YOUR_BACKEND_IP:5000/"
```

### 3. Add Required Permissions
The `AndroidManifest.xml` already includes:
- `android.permission.INTERNET` - API calls
- `android.permission.ACCESS_NETWORK_STATE` - Network checks

### 4. Build & Run

#### Run on Emulator
1. Click **Tools → Device Manager**
2. Create or select an Android Emulator (API 24+)
3. Click the play button to start emulator
4. In Android Studio, click **Run → Run 'app'**
5. Select the running emulator

#### Run on Physical Device
1. Enable Developer Mode on Android device
2. Enable USB Debugging
3. Connect device via USB
4. In Android Studio, click **Run → Run 'app'**
5. Select your physical device

### 5. App Flow
- **Splash Screen** (2 seconds) → Shows logo & app name
- **Dashboard** → Navigate to Risk Score, Disputes, Admin
- **Risk Score** → Displays borrower's risk assessment
- **Dispute** → File dispute with reason & evidence
- **Admin** → View all disputes (admin only)

## Testing

### Emulator API Calls
The app uses `http://10.0.2.2:5000/` to reach localhost from emulator.

Ensure your backend is running:
```bash
npm start  # From backend directory
```

### Test Endpoints
- `GET /api/users/{id}/score` - Risk score
- `POST /api/disputes/create` - Submit dispute
- `GET /api/disputes` - List disputes
- `POST /api/loans/create` - Create loan

## Troubleshooting

### Gradle Sync Fails
- Update Android Studio to latest version
- Invalidate caches: **File → Invalidate Caches → Restart**
- Delete `.gradle/` folder and sync again

### API Calls Timeout
- Check backend is running on correct port (5000)
- Use correct URL for device type (emulator vs physical)
- Enable network requests in emulator settings

### Activities Won't Load
- Check `AndroidManifest.xml` for correct package names
- Ensure all imports are correct
- Clean & rebuild: **Build → Clean Project**

## Dependencies
- **Retrofit 2.9.0** - REST API client
- **OkHttp 4.11.0** - HTTP logging
- **Gson 2.10.1** - JSON serialization
- **Lifecycle 2.7.0** - ViewModel & LiveData
- **Material Components 1.11.0** - UI components

## Next Steps
1. Implement **LoginActivity** for JWT authentication
2. Add **LoanCreationActivity** for new loans
3. Implement **Adapters** for list views
4. Add **error handling** UI for failed requests
5. Test full flow in emulator

## Notes
- All Activities are exported (`android:exported="true"`) for testing
- JwtManager stores authentication tokens in SharedPreferences
- ViewModels use Kotlin Coroutines for async API calls
- Material Design colors: Green (#2BB673), Blue (#1E88E5), Orange (#F57C00)
