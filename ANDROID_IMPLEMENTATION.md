# Android Implementation Guide - Phase 4

## Overview

Complete Android implementation guide for offline M-PESA debt allocation system with SQLite local storage, sync engine, and Kotlin architecture.

**Status:** 📋 Phase 4 - Implementation Guide  
**Target:** Android 7.0+ (API 24+)  
**Language:** Kotlin  
**Database:** SQLite with Room ORM

---

## Project Structure

```
MpesaDebtApp/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/mpesa/debt/
│   │   │   │   ├── data/
│   │   │   │   │   ├── local/
│   │   │   │   │   │   ├── AppDatabase.kt
│   │   │   │   │   │   ├── dao/
│   │   │   │   │   │   │   ├── UserDao.kt
│   │   │   │   │   │   │   ├── LoanDao.kt
│   │   │   │   │   │   │   ├── TransactionDao.kt
│   │   │   │   │   │   │   ├── RepaymentDao.kt
│   │   │   │   │   │   │   └── SyncQueueDao.kt
│   │   │   │   │   │   └── entities/
│   │   │   │   │   │       ├── User.kt
│   │   │   │   │   │       ├── Loan.kt
│   │   │   │   │   │       ├── Transaction.kt
│   │   │   │   │   │       ├── Repayment.kt
│   │   │   │   │   │       └── SyncQueueItem.kt
│   │   │   │   │   │
│   │   │   │   │   ├── remote/
│   │   │   │   │   │   └── ApiService.kt
│   │   │   │   │   │
│   │   │   │   │   └── repository/
│   │   │   │   │       ├── LoanRepository.kt
│   │   │   │   │       ├── UserRepository.kt
│   │   │   │   │       ├── TransactionRepository.kt
│   │   │   │   │       └── SyncRepository.kt
│   │   │   │   │
│   │   │   │   ├── services/
│   │   │   │   │   ├── SyncService.kt
│   │   │   │   │   ├── OfflineService.kt
│   │   │   │   │   └── NotificationService.kt
│   │   │   │   │
│   │   │   │   ├── ui/
│   │   │   │   │   ├── MainActivity.kt
│   │   │   │   │   ├── screens/
│   │   │   │   │   │   ├── LoginScreen.kt
│   │   │   │   │   │   ├── DashboardScreen.kt
│   │   │   │   │   │   ├── LoansScreen.kt
│   │   │   │   │   │   ├── RequestLoanScreen.kt
│   │   │   │   │   │   └── WalletScreen.kt
│   │   │   │   │   └── components/
│   │   │   │   │       ├── LoanCard.kt
│   │   │   │   │       ├── LoadingDialog.kt
│   │   │   │   │       └── SyncStatus.kt
│   │   │   │   │
│   │   │   │   ├── viewmodels/
│   │   │   │   │   ├── LoanViewModel.kt
│   │   │   │   │   ├── UserViewModel.kt
│   │   │   │   │   └── SyncViewModel.kt
│   │   │   │   │
│   │   │   │   └── utils/
│   │   │   │       ├── NetworkManager.kt
│   │   │   │       ├── SyncManager.kt
│   │   │   │       └── Constants.kt
│   │   │   │
│   │   │   └── res/
│   │   │       ├── layout/
│   │   │       ├── values/
│   │   │       └── drawable/
│   │   │
│   │   └── test/
│   │
│   └── build.gradle.kts
│
└── build.gradle.kts (root)
```

---

## Dependencies (build.gradle.kts)

```kotlin
dependencies {
  // Kotlin
  implementation("org.jetbrains.kotlin:kotlin-stdlib:1.9.20")
  implementation("androidx.core:core-ktx:1.12.0")
  
  // Android
  implementation("androidx.appcompat:appcompat:1.6.1")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.6.2")
  
  // Jetpack Compose (UI)
  implementation(platform("androidx.compose:compose-bom:2023.10.00"))
  implementation("androidx.compose.ui:ui")
  implementation("androidx.compose.material3:material3")
  implementation("androidx.compose.foundation:foundation")
  
  // Room (Local Database)
  implementation("androidx.room:room-runtime:2.6.0")
  implementation("androidx.room:room-ktx:2.6.0")
  kapt("androidx.room:room-compiler:2.6.0")
  
  // Retrofit (HTTP Client)
  implementation("com.squareup.retrofit2:retrofit:2.9.0")
  implementation("com.squareup.retrofit2:converter-gson:2.9.0")
  
  // Coroutines
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.1")
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.1")
  
  // Hilt (Dependency Injection)
  implementation("com.google.dagger:hilt-android:2.48")
  kapt("com.google.dagger:hilt-compiler:2.48")
  
  // WorkManager (Background Sync)
  implementation("androidx.work:work-runtime-ktx:2.8.1")
  
  // Security (Encrypted SharedPreferences)
  implementation("androidx.security:security-crypto:1.1.0-alpha06")
  
  // Logging
  implementation("com.jakewharton.timber:timber:5.0.1")
  
  // Testing
  testImplementation("junit:junit:4.13.2")
  testImplementation("androidx.room:room-testing:2.6.0")
  testImplementation("org.mockito:mockito-core:5.3.1")
  
  androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}
```

---

## Core Components

### 1. Room Database Setup

**AppDatabase.kt**
```kotlin
import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(
  entities = [User::class, Loan::class, Transaction::class, Repayment::class, SyncQueueItem::class],
  version = 1,
  exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
  abstract fun userDao(): UserDao
  abstract fun loanDao(): LoanDao
  abstract fun transactionDao(): TransactionDao
  abstract fun repaymentDao(): RepaymentDao
  abstract fun syncQueueDao(): SyncQueueDao

  companion object {
    @Volatile
    private var INSTANCE: AppDatabase? = null

    fun getInstance(context: Context): AppDatabase =
      INSTANCE ?: synchronized(this) {
        INSTANCE ?: Room.databaseBuilder(
          context.applicationContext,
          AppDatabase::class.java,
          "mpesa_debt.db"
        )
          .fallbackToDestructiveMigration()
          .build()
          .also { INSTANCE = it }
      }
  }
}
```

### 2. Entity Models

**User.kt**
```kotlin
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class User(
  @PrimaryKey
  val id: String,
  val phone: String,
  val name: String,
  val email: String?,
  val walletBalance: Double = 0.0,
  val createdAt: Long,
  val updatedAt: Long,
  val synced: Boolean = false,
  val syncTimestamp: Long = 0
)
```

**Loan.kt**
```kotlin
@Entity(
  tableName = "loans",
  foreignKeys = [
    ForeignKey(entity = User::class, parentColumns = ["id"], childColumns = ["borrowerId"]),
    ForeignKey(entity = User::class, parentColumns = ["id"], childColumns = ["lenderId"])
  ],
  indices = [
    Index("borrowerId"),
    Index("lenderId"),
    Index("borrowerPhone"),
    Index("lenderPhone"),
    Index("status"),
    Index("synced")
  ]
)
data class Loan(
  @PrimaryKey
  val id: String,
  val borrowerId: String,
  val borrowerPhone: String,
  val lenderId: String,
  val lenderPhone: String,
  val amount: Double,
  val balance: Double,
  val repaymentAmount: Double,
  val status: String = "pending", // pending, approved, active, completed
  val notes: String? = null,
  val createdAt: Long,
  val updatedAt: Long,
  val dueDate: Long? = null,
  val completedAt: Long? = null,
  val synced: Boolean = false,
  val syncTimestamp: Long = 0,
  val conflictResolved: Boolean = false
)
```

### 3. DAOs (Data Access Objects)

**LoanDao.kt**
```kotlin
import androidx.room.Dao
import androidx.room.Query
import androidx.room.Insert
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface LoanDao {
  
  @Insert
  suspend fun insert(loan: Loan): Long
  
  @Update
  suspend fun update(loan: Loan)
  
  @Query("SELECT * FROM loans WHERE id = :id")
  suspend fun getLoanById(id: String): Loan?
  
  @Query("SELECT * FROM loans WHERE borrowerId = :userId ORDER BY createdAt DESC")
  fun getBorrowerLoans(userId: String): Flow<List<Loan>>
  
  @Query("SELECT * FROM loans WHERE lenderId = :userId ORDER BY createdAt DESC")
  fun getLenderLoans(userId: String): Flow<List<Loan>>
  
  @Query("SELECT * FROM loans WHERE borrowerPhone = :phone ORDER BY createdAt DESC")
  suspend fun getLoansByBorrowerPhone(phone: String): List<Loan>
  
  @Query("SELECT * FROM loans WHERE lenderPhone = :phone ORDER BY createdAt DESC")
  suspend fun getLoansByLenderPhone(phone: String): List<Loan>
  
  @Query("SELECT * FROM loans WHERE status = :status ORDER BY createdAt DESC")
  fun getLoansByStatus(status: String): Flow<List<Loan>>
  
  @Query("UPDATE loans SET balance = :newBalance, updatedAt = :timestamp WHERE id = :loanId")
  suspend fun updateBalance(loanId: String, newBalance: Double, timestamp: Long)
  
  @Query("SELECT * FROM loans WHERE synced = 0")
  suspend fun getUnsyncedLoans(): List<Loan>
}
```

### 4. Repository Pattern

**LoanRepository.kt**
```kotlin
class LoanRepository(private val loanDao: LoanDao) {
  
  // Observe loans for borrower
  fun observeBorrowerLoans(userId: String): Flow<List<Loan>> =
    loanDao.getBorrowerLoans(userId)
  
  // Create loan offline
  suspend fun createLoanOffline(
    borrowerId: String,
    borrowerPhone: String,
    lenderPhone: String,
    amount: Double,
    repaymentAmount: Double,
    notes: String? = null
  ) {
    val loan = Loan(
      id = UUID.randomUUID().toString(),
      borrowerId = borrowerId,
      borrowerPhone = borrowerPhone,
      lenderId = "", // Will fill on sync
      lenderPhone = lenderPhone,
      amount = amount,
      balance = amount,
      repaymentAmount = repaymentAmount,
      notes = notes,
      createdAt = System.currentTimeMillis(),
      updatedAt = System.currentTimeMillis(),
      synced = false
    )
    
    loanDao.insert(loan)
    
    // Queue for sync
    SyncManager.queueOperation("loans", "CREATE", loan)
  }
  
  // Get unsync'd loans
  suspend fun getUnsyncedLoans(): List<Loan> = loanDao.getUnsyncedLoans()
  
  // Mark as synced
  suspend fun markAsSynced(loanId: String) {
    val loan = loanDao.getLoanById(loanId) ?: return
    loanDao.update(loan.copy(synced = true, syncTimestamp = System.currentTimeMillis()))
  }
}
```

### 5. Sync Service

**SyncService.kt**
```kotlin
class SyncService(
  private val apiService: ApiService,
  private val syncQueueDao: SyncQueueDao,
  private val loanRepository: LoanRepository,
  private val networkManager: NetworkManager
) {
  
  suspend fun performFullSync(phoneNumber: String) {
    try {
      if (!networkManager.isConnected()) {
        return // No internet, queue will sync later
      }
      
      // 1. Process offline queue
      val queueItems = syncQueueDao.getUnsyncedItems()
      for (item in queueItems) {
        try {
          processSyncItem(item, phoneNumber)
          syncQueueDao.markAsSynced(item.id)
        } catch (e: Exception) {
          syncQueueDao.incrementRetry(item.id, e.message ?: "Unknown error")
        }
      }
      
      // 2. Fetch incremental changes
      val lastSync = syncQueueDao.getLastSyncTimestamp(phoneNumber)
      val changes = apiService.getChanges(phoneNumber, lastSync)
      applyChangesLocally(changes)
      
      // 3. Update sync timestamp
      syncQueueDao.updateSyncTimestamp(phoneNumber, System.currentTimeMillis())
      
    } catch (e: Exception) {
      Timber.e(e, "Sync failed: ${e.message}")
    }
  }
  
  private suspend fun processSyncItem(item: SyncQueueItem, phoneNumber: String) {
    val data = item.data
    when (item.entityType) {
      "loans" -> {
        apiService.createLoan(data)
      }
      "transactions" -> {
        apiService.createTransaction(data)
      }
      "repayments" -> {
        apiService.createRepayment(data)
      }
    }
  }
  
  private suspend fun applyChangesLocally(changes: List<Change>) {
    for (change in changes) {
      when (change.type) {
        "loan" -> {
          // Update local loan
          val loan = change.data as Loan
          loanDao.update(loan)
        }
      }
    }
  }
}
```

### 6. Network Manager

**NetworkManager.kt**
```kotlin
class NetworkManager(context: Context) {
  private val connectivityManager =
    context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
  
  fun isConnected(): Boolean {
    val network = connectivityManager.activeNetwork ?: return false
    val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
    
    return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
  }
  
  fun observeNetworkStatus(): Flow<Boolean> = flow {
    emit(isConnected())
    
    val callback = object : ConnectivityManager.NetworkCallback() {
      override fun onAvailable(network: Network) {
        runBlocking { emit(true) }
      }
      
      override fun onLost(network: Network) {
        runBlocking { emit(false) }
      }
    }
    
    connectivityManager.registerNetworkCallback(
      NetworkRequest.Builder()
        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        .build(),
      callback
    )
  }
}
```

### 7. ViewModel

**LoanViewModel.kt**
```kotlin
@HiltViewModel
class LoanViewModel @Inject constructor(
  private val loanRepository: LoanRepository,
  private val syncRepository: SyncRepository,
  private val networkManager: NetworkManager
) : ViewModel() {
  
  val borrowerLoans: Flow<List<Loan>> = loanRepository.observeBorrowerLoans("")
  
  val syncStatus: MutableState<SyncStatus> = mutableStateOf(SyncStatus.Idle)
  
  fun createLoan(lenderPhone: String, amount: Double, repayment: Double) {
    viewModelScope.launch {
      try {
        loanRepository.createLoanOffline("", "", lenderPhone, amount, repayment)
        
        // Auto-sync if online
        if (networkManager.isConnected()) {
          syncRepository.performFullSync("")
        }
      } catch (e: Exception) {
        syncStatus.value = SyncStatus.Error(e.message ?: "Unknown error")
      }
    }
  }
  
  fun syncOfflineData() {
    viewModelScope.launch {
      try {
        syncStatus.value = SyncStatus.Syncing
        syncRepository.performFullSync("")
        syncStatus.value = SyncStatus.Success("Sync completed")
      } catch (e: Exception) {
        syncStatus.value = SyncStatus.Error(e.message ?: "Sync failed")
      }
    }
  }
}

sealed class SyncStatus {
  object Idle : SyncStatus()
  object Syncing : SyncStatus()
  data class Success(val message: String) : SyncStatus()
  data class Error(val message: String) : SyncStatus()
}
```

---

## UI Implementation (Jetpack Compose)

### Dashboard Screen with Sync Status

```kotlin
@Composable
fun DashboardScreen(viewModel: LoanViewModel) {
  val loans by viewModel.borrowerLoans.collectAsState(initial = emptyList())
  val syncStatus by viewModel.syncStatus
  
  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(16.dp)
  ) {
    // Sync Status Bar
    SyncStatusBar(syncStatus) { viewModel.syncOfflineData() }
    
    // Loans List
    LazyColumn {
      items(loans) { loan ->
        LoanCard(loan = loan)
      }
    }
    
    // FAB to request new loan
    FloatingActionButton(
      onClick = { /* Navigate to request loan */ },
      modifier = Modifier.align(Alignment.End)
    ) {
      Icon(Icons.Default.Add, contentDescription = "Request Loan")
    }
  }
}

@Composable
fun SyncStatusBar(status: SyncStatus, onSync: () -> Unit) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .padding(8.dp)
      .background(Color.LightGray, RoundedCornerShape(8.dp))
      .padding(12.dp),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.CenterVertically
  ) {
    when (status) {
      is SyncStatus.Syncing -> {
        CircularProgressIndicator(modifier = Modifier.size(20.dp))
        Text("Syncing...")
      }
      is SyncStatus.Success -> {
        Icon(Icons.Default.Check, contentDescription = null, tint = Color.Green)
        Text(status.message, color = Color.Green)
      }
      is SyncStatus.Error -> {
        Icon(Icons.Default.Warning, contentDescription = null, tint = Color.Red)
        Text(status.message, color = Color.Red)
        Button(onClick = onSync) {
          Text("Retry")
        }
      }
      else -> {
        Text("Ready")
      }
    }
  }
}
```

---

## Background Sync (WorkManager)

**SyncWorker.kt**
```kotlin
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
  
  override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
    try {
      val phoneNumber = inputData.getString("phone") ?: return@withContext Result.retry()
      
      // Get repository instances
      val db = AppDatabase.getInstance(applicationContext)
      val syncRepository = SyncRepository(db.syncQueueDao(), /* other DAOs */)
      
      // Perform sync
      syncRepository.performFullSync(phoneNumber)
      
      Result.success()
    } catch (e: Exception) {
      Timber.e(e, "Sync worker failed")
      Result.retry()
    }
  }
}
```

**Schedule Periodic Sync**
```kotlin
fun schedulePeriodicSync(context: Context, phoneNumber: String) {
  val syncWork = PeriodicWorkRequestBuilder<SyncWorker>(
    15, TimeUnit.MINUTES // Sync every 15 minutes
  )
    .setInputData(workDataOf("phone" to phoneNumber))
    .addTag("sync_work")
    .build()
  
  WorkManager.getInstance(context).enqueueUniquePeriodicWork(
    "mpesa_sync",
    ExistingPeriodicWorkPolicy.KEEP,
    syncWork
  )
}
```

---

## Security Best Practices

### Encrypted SharedPreferences

```kotlin
val masterKey = MasterKey.Builder(context)
  .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
  .build()

val encryptedPrefs = EncryptedSharedPreferences.create(
  context,
  "mpesa_prefs",
  masterKey,
  EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
  EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)

// Store sensitive data
encryptedPrefs.edit().putString("user_pin", encryptPIN("1234")).apply()
encryptedPrefs.edit().putString("jwt_token", token).apply()
```

### Database Encryption

```kotlin
Room.databaseBuilder(context, AppDatabase::class.java, "mpesa_debt.db")
  .setJournalMode(JournalMode.WRITE_AHEAD_LOGGING)
  .build()

// Add SQLCipher for encryption if needed
// import net.zetetic.database.sqlcipher.SQLiteDatabase
```

---

## Testing Strategy

### Unit Tests

```kotlin
@RunWith(AndroidJUnit4::class)
class LoanDaoTest {
  
  @get:Rule
  val instantExecutorRule = InstantTaskExecutorRule()
  
  private lateinit var database: AppDatabase
  private lateinit var loanDao: LoanDao
  
  @Before
  fun setUp() {
    database = Room.inMemoryDatabaseBuilder(
      InstrumentationRegistry.getInstrumentation().targetContext,
      AppDatabase::class.java
    ).build()
    loanDao = database.loanDao()
  }
  
  @After
  fun closeDb() = database.close()
  
  @Test
  fun insertAndRetrieveLoan() = runTest {
    val loan = Loan(
      id = "loan-1",
      borrowerId = "user-1",
      borrowerPhone = "254701234567",
      lenderId = "user-2",
      lenderPhone = "254702345678",
      amount = 5000.0,
      balance = 5000.0,
      repaymentAmount = 500.0,
      createdAt = System.currentTimeMillis(),
      updatedAt = System.currentTimeMillis()
    )
    
    loanDao.insert(loan)
    
    val retrieved = loanDao.getLoanById("loan-1")
    assertEquals(loan, retrieved)
  }
}
```

### Integration Tests

```kotlin
@RunWith(AndroidJUnit4::class)
class SyncIntegrationTest {
  
  @Test
  fun syncOfflineQueueWithBackend() = runTest {
    // 1. Create offline loan
    val loan = /* create test loan */
    loanDao.insert(loan)
    
    // 2. Queue for sync
    syncQueueDao.insert(SyncQueueItem(
      entityType = "loans",
      operation = "CREATE",
      data = loan
    ))
    
    // 3. Perform sync
    syncService.performFullSync("254701234567")
    
    // 4. Verify synced
    val synced = syncQueueDao.getUnsyncedItems()
    assertTrue(synced.isEmpty())
  }
}
```

---

## Deployment Checklist

- [ ] Minify code (ProGuard/R8)
- [ ] Remove debug logs
- [ ] Test on devices (not just emulator)
- [ ] Test offline mode thoroughly
- [ ] Test sync with poor network
- [ ] Test battery impact
- [ ] Encrypt sensitive data
- [ ] Test database migrations
- [ ] Set up crash reporting
- [ ] Performance profiling
- [ ] Security audit
- [ ] Play Store submission

---

## Next Steps

1. **Setup Android Studio project**
2. **Create database schema**
3. **Implement DAOs and entities**
4. **Build repositories**
5. **Create sync service**
6. **Implement UI screens**
7. **Add background sync**
8. **Security hardening**
9. **Testing**
10. **Deploy to Play Store**

---

**Status:** Phase 4 - Implementation Guide Complete  
**Next:** Phase 5 - Safaricom Integration

