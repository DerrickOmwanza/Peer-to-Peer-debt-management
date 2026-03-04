/**
 * Sync Engine
 * Manages synchronization between offline SQLite and PostgreSQL backend
 * Handles conflict resolution, versioning, and incremental syncs
 */

const db = require('../config/database');

/**
 * CONFLICT RESOLUTION STRATEGIES
 */
const ConflictResolution = {
  LOCAL_WINS: 'LOCAL_WINS',      // Use local version (newer timestamp)
  SERVER_WINS: 'SERVER_WINS',    // Use server version
  MERGE: 'MERGE',                 // Merge both versions (field-level)
  MANUAL: 'MANUAL'                // Require manual resolution
};

/**
 * ENTITY TYPES
 */
const EntityType = {
  USER: 'users',
  LOAN: 'loans',
  TRANSACTION: 'transactions',
  REPAYMENT: 'repayments'
};

/**
 * Conflict detection and resolution
 */
class ConflictResolver {
  /**
   * Detect if sync conflict exists
   */
  static detectConflict(localRecord, serverRecord) {
    if (!localRecord || !serverRecord) {
      return null; // No conflict if one doesn't exist
    }

    return {
      hasConflict: localRecord.version !== serverRecord.version,
      localVersion: localRecord.version || 1,
      serverVersion: serverRecord.version || 1,
      localTimestamp: localRecord.updated_at,
      serverTimestamp: serverRecord.updated_at
    };
  }

  /**
   * Resolve conflict based on strategy
   */
  static resolve(conflict, strategy = ConflictResolution.LOCAL_WINS) {
    if (!conflict.hasConflict) {
      return { strategy: 'NO_CONFLICT', winner: 'both' };
    }

    switch (strategy) {
      case ConflictResolution.LOCAL_WINS:
        return ConflictResolver.localWinsResolution(conflict);

      case ConflictResolution.SERVER_WINS:
        return ConflictResolver.serverWinsResolution(conflict);

      case ConflictResolution.MERGE:
        return ConflictResolver.mergeResolution(conflict);

      default:
        return { strategy: 'MANUAL', winner: 'none', requiresReview: true };
    }
  }

  static localWinsResolution(conflict) {
    // Local is newer if it has higher version or newer timestamp
    const localNewer = conflict.localVersion > conflict.serverVersion ||
                      conflict.localTimestamp > conflict.serverTimestamp;

    return {
      strategy: ConflictResolution.LOCAL_WINS,
      winner: localNewer ? 'local' : 'server',
      reason: `${localNewer ? 'Local' : 'Server'} record is newer`
    };
  }

  static serverWinsResolution(conflict) {
    return {
      strategy: ConflictResolution.SERVER_WINS,
      winner: 'server',
      reason: 'Server version takes precedence'
    };
  }

  static mergeResolution(conflict) {
    return {
      strategy: ConflictResolution.MERGE,
      winner: 'merged',
      reason: 'Records merged at field level'
    };
  }
}

/**
 * Sync Queue Manager
 */
class SyncQueueManager {
  /**
   * Add item to sync queue
   */
  static async queueOperation(entityType, operation, data, phoneNumber) {
    try {
      const id = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const query = `
        INSERT INTO sync_queue (id, entity_type, operation, data, phone_number, created_at, synced)
        VALUES ($1, $2, $3, $4, $5, $6, false)
        RETURNING *
      `;

      const result = await db.query(query, [
        id,
        entityType,
        operation,
        JSON.stringify(data),
        phoneNumber,
        Date.now()
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error queuing operation:', error);
      throw error;
    }
  }

  /**
   * Get pending sync items for user
   */
  static async getPendingSyncItems(phoneNumber) {
    try {
      const query = `
        SELECT * FROM sync_queue
        WHERE phone_number = $1 AND synced = false
        ORDER BY created_at ASC
      `;

      const result = await db.query(query, [phoneNumber]);
      return result.rows;
    } catch (error) {
      console.error('Error getting pending sync items:', error);
      throw error;
    }
  }

  /**
   * Mark sync item as synced
   */
  static async markAsSynced(queueId) {
    try {
      const query = `
        UPDATE sync_queue
        SET synced = true, synced_at = $1
        WHERE id = $2
        RETURNING *
      `;

      const result = await db.query(query, [Date.now(), queueId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error marking as synced:', error);
      throw error;
    }
  }

  /**
   * Increment retry count
   */
  static async incrementRetryCount(queueId, errorMessage) {
    try {
      const query = `
        UPDATE sync_queue
        SET retry_count = retry_count + 1,
            last_retry_at = $1,
            error_message = $2
        WHERE id = $3
        RETURNING *
      `;

      const result = await db.query(query, [Date.now(), errorMessage, queueId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error incrementing retry count:', error);
      throw error;
    }
  }

  /**
   * Get dead-letter queue (max retries exceeded)
   */
  static async getDeadLetterQueue(maxRetries = 5) {
    try {
      const query = `
        SELECT * FROM sync_queue
        WHERE retry_count >= $1 AND synced = false
        ORDER BY created_at ASC
      `;

      const result = await db.query(query, [maxRetries]);
      return result.rows;
    } catch (error) {
      console.error('Error getting dead letter queue:', error);
      throw error;
    }
  }
}

/**
 * Incremental Sync Manager
 */
class IncrementalSyncManager {
  /**
   * Get last sync timestamp for user
   */
  static async getLastSyncTimestamp(phoneNumber) {
    try {
      const query = `
        SELECT MAX(sync_timestamp) as last_sync
        FROM users
        WHERE phone = $1 AND synced = true
      `;

      const result = await db.query(query, [phoneNumber]);
      return result.rows[0]?.last_sync || 0;
    } catch (error) {
      console.error('Error getting last sync timestamp:', error);
      return 0;
    }
  }

  /**
   * Get changes since last sync
   */
  static async getChangesSinceLastSync(phoneNumber, lastSyncTime) {
    try {
      const query = `
        SELECT 'loans' as entity_type, id, borrower_phone, lender_phone, updated_at
        FROM loans
        WHERE (borrower_phone = $1 OR lender_phone = $1) 
          AND updated_at > $2
        
        UNION ALL
        
        SELECT 'transactions', id, user_phone, null, updated_at
        FROM transactions
        WHERE user_phone = $1 AND updated_at > $2
        
        UNION ALL
        
        SELECT 'repayments', id, borrower_phone, lender_phone, updated_at
        FROM repayments
        WHERE (borrower_phone = $1 OR lender_phone = $1) AND updated_at > $2
        
        ORDER BY updated_at ASC
      `;

      const result = await db.query(query, [phoneNumber, lastSyncTime]);
      return result.rows;
    } catch (error) {
      console.error('Error getting changes:', error);
      throw error;
    }
  }

  /**
   * Update sync timestamp
   */
  static async updateSyncTimestamp(phoneNumber, timestamp) {
    try {
      const query = `
        UPDATE users
        SET sync_timestamp = $1
        WHERE phone = $2
      `;

      await db.query(query, [timestamp, phoneNumber]);
    } catch (error) {
      console.error('Error updating sync timestamp:', error);
      throw error;
    }
  }
}

/**
 * Main Sync Engine
 */
class SyncEngine {
  /**
   * Process sync queue for a user
   */
  static async processSyncQueue(phoneNumber, clientData = {}) {
    const results = {
      synced: [],
      failed: [],
      conflicts: [],
      totalItems: 0,
      startTime: Date.now()
    };

    try {
      // Get pending items
      const pendingItems = await SyncQueueManager.getPendingSyncItems(phoneNumber);
      results.totalItems = pendingItems.length;

      if (pendingItems.length === 0) {
        return {
          ...results,
          message: 'No items to sync',
          duration: Date.now() - results.startTime
        };
      }

      // Process each item
      for (const item of pendingItems) {
        try {
          const syncResult = await this.processSyncItem(item, phoneNumber, clientData);

          if (syncResult.success) {
            await SyncQueueManager.markAsSynced(item.id);
            results.synced.push({
              id: item.id,
              type: item.entity_type,
              operation: item.operation
            });
          } else if (syncResult.conflict) {
            results.conflicts.push({
              id: item.id,
              type: item.entity_type,
              conflict: syncResult.conflict,
              resolution: syncResult.resolution
            });
          } else {
            results.failed.push({
              id: item.id,
              type: item.entity_type,
              error: syncResult.error
            });

            // Increment retry count
            await SyncQueueManager.incrementRetryCount(item.id, syncResult.error);
          }
        } catch (itemError) {
          console.error(`Error processing queue item ${item.id}:`, itemError);
          results.failed.push({
            id: item.id,
            type: item.entity_type,
            error: itemError.message
          });
        }
      }

      results.duration = Date.now() - results.startTime;
      return results;

    } catch (error) {
      console.error('Error processing sync queue:', error);
      throw error;
    }
  }

  /**
   * Process individual sync item
   */
  static async processSyncItem(item, phoneNumber, clientData) {
    try {
      const data = JSON.parse(item.data);

      switch (item.entity_type) {
        case EntityType.LOAN:
          return await this.syncLoan(item, data);

        case EntityType.TRANSACTION:
          return await this.syncTransaction(item, data);

        case EntityType.REPAYMENT:
          return await this.syncRepayment(item, data);

        case EntityType.USER:
          return await this.syncUser(item, data);

        default:
          return { success: false, error: 'Unknown entity type' };
      }
    } catch (error) {
      console.error('Error processing sync item:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync loan
   */
  static async syncLoan(item, data) {
    try {
      if (item.operation === 'CREATE') {
        // Create loan from offline data
        const lender = await this.getUserByPhone(data.lenderPhone);
        if (!lender) {
          return { success: false, error: 'Lender not found' };
        }

        const borrower = await this.getUserByPhone(data.borrowerPhone);
        if (!borrower) {
          return { success: false, error: 'Borrower not found' };
        }

        const query = `
          INSERT INTO loans (borrower_id, lender_id, amount, balance, repayment_amount, status, created_at)
          VALUES ($1, $2, $3, $3, $4, 'pending', NOW())
          RETURNING *
        `;

        await db.query(query, [
          borrower.id,
          lender.id,
          data.amount,
          data.repaymentAmount
        ]);

        return { success: true };
      }

      return { success: false, error: 'Unsupported operation' };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync transaction
   */
  static async syncTransaction(item, data) {
    try {
      if (item.operation === 'CREATE') {
        const query = `
          INSERT INTO transactions (user_id, amount, transaction_type, status, created_at)
          SELECT id, $1, $2, $3, $4
          FROM users
          WHERE phone = $5
        `;

        const result = await db.query(query, [
          data.amount,
          data.transaction_type || 'incoming',
          data.status || 'completed',
          Date.now(),
          data.userPhone
        ]);

        if (result.rowCount === 0) {
          return { success: false, error: 'User not found' };
        }

        return { success: true };
      }

      return { success: false, error: 'Unsupported operation' };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync repayment
   */
  static async syncRepayment(item, data) {
    try {
      // Verify loan exists
      const loanQuery = `SELECT * FROM loans WHERE id = $1`;
      const loanResult = await db.query(loanQuery, [data.loanId]);

      if (loanResult.rowCount === 0) {
        return { success: false, error: 'Loan not found' };
      }

      // Create repayment record
      const query = `
        INSERT INTO repayments (loan_id, transaction_id, amount, balance_after, borrower_id, lender_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `;

      await db.query(query, [
        data.loanId,
        data.transactionId,
        data.amount,
        data.balanceAfter,
        data.borrowerId,
        data.lenderId
      ]);

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync user
   */
  static async syncUser(item, data) {
    try {
      if (item.operation === 'UPDATE') {
        const query = `
          UPDATE users
          SET name = COALESCE($1, name),
              email = COALESCE($2, email),
              wallet_balance = COALESCE($3, wallet_balance),
              updated_at = NOW()
          WHERE phone = $4
        `;

        const result = await db.query(query, [
          data.name,
          data.email,
          data.walletBalance,
          data.phone
        ]);

        if (result.rowCount === 0) {
          return { success: false, error: 'User not found' };
        }

        return { success: true };
      }

      return { success: false, error: 'Unsupported operation' };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user by phone
   */
  static async getUserByPhone(phone) {
    try {
      const query = 'SELECT * FROM users WHERE phone = $1';
      const result = await db.query(query, [phone]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  /**
   * Full sync operation
   */
  static async fullSync(phoneNumber) {
    const syncResult = {
      startTime: Date.now(),
      phases: {}
    };

    try {
      // Phase 1: Process offline queue
      console.log(`[SYNC] Phase 1: Processing offline queue for ${phoneNumber}`);
      syncResult.phases.queueProcessing = await this.processSyncQueue(phoneNumber);

      // Phase 2: Get incremental changes since last sync
      console.log(`[SYNC] Phase 2: Getting incremental changes`);
      const lastSync = await IncrementalSyncManager.getLastSyncTimestamp(phoneNumber);
      const changes = await IncrementalSyncManager.getChangesSinceLastSync(phoneNumber, lastSync);
      syncResult.phases.incrementalSync = {
        changeCount: changes.length,
        changes: changes
      };

      // Phase 3: Update sync timestamp
      console.log(`[SYNC] Phase 3: Updating sync timestamp`);
      await IncrementalSyncManager.updateSyncTimestamp(phoneNumber, Date.now());

      syncResult.duration = Date.now() - syncResult.startTime;
      syncResult.success = true;
      syncResult.message = `Sync completed in ${syncResult.duration}ms`;

      console.log(`[SYNC] Completed: ${syncResult.message}`);
      return syncResult;

    } catch (error) {
      console.error('Error during full sync:', error);
      syncResult.success = false;
      syncResult.error = error.message;
      syncResult.duration = Date.now() - syncResult.startTime;
      return syncResult;
    }
  }
}

module.exports = {
  SyncEngine,
  SyncQueueManager,
  IncrementalSyncManager,
  ConflictResolver,
  ConflictResolution,
  EntityType
};
