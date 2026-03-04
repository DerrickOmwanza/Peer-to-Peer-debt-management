/**
 * USSD Offline Storage Service
 * Caches data locally during offline USSD interactions
 * Syncs with backend when online
 */

const fs = require('fs').promises;
const path = require('path');

const STORAGE_DIR = path.join(__dirname, '../../data/ussd-cache');
const SYNC_QUEUE_FILE = path.join(STORAGE_DIR, 'sync-queue.json');
const USER_CACHE_DIR = path.join(STORAGE_DIR, 'users');

class USSDStorage {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    try {
      // Create directories if they don't exist
      await fs.mkdir(STORAGE_DIR, { recursive: true });
      await fs.mkdir(USER_CACHE_DIR, { recursive: true });
      this.initialized = true;
      console.log('USSD Storage initialized');
    } catch (error) {
      console.error('Failed to initialize USSD storage:', error);
      throw error;
    }
  }

  /**
   * Cache user data locally
   */
  async cacheUserData(phoneNumber, userData) {
    try {
      const userFile = path.join(USER_CACHE_DIR, `${phoneNumber}.json`);
      const cacheData = {
        phoneNumber,
        data: userData,
        cachedAt: Date.now(),
        synced: false
      };
      await fs.writeFile(userFile, JSON.stringify(cacheData, null, 2));
      return cacheData;
    } catch (error) {
      console.error('Failed to cache user data:', error);
      throw error;
    }
  }

  /**
   * Retrieve cached user data
   */
  async getUserCache(phoneNumber) {
    try {
      const userFile = path.join(USER_CACHE_DIR, `${phoneNumber}.json`);
      const data = await fs.readFile(userFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      console.error('Failed to retrieve user cache:', error);
      throw error;
    }
  }

  /**
   * Add transaction to sync queue (for offline transactions)
   */
  async queueTransaction(phoneNumber, transaction) {
    try {
      const queue = await this.getSyncQueue();
      
      const queueItem = {
        id: Date.now().toString(),
        type: 'TRANSACTION',
        phoneNumber,
        data: transaction,
        queuedAt: Date.now(),
        synced: false,
        retryCount: 0
      };

      queue.push(queueItem);
      await this.saveSyncQueue(queue);
      
      return queueItem;
    } catch (error) {
      console.error('Failed to queue transaction:', error);
      throw error;
    }
  }

  /**
   * Add loan request to sync queue
   */
  async queueLoanRequest(phoneNumber, loanRequest) {
    try {
      const queue = await this.getSyncQueue();
      
      const queueItem = {
        id: Date.now().toString(),
        type: 'LOAN_REQUEST',
        phoneNumber,
        data: loanRequest,
        queuedAt: Date.now(),
        synced: false,
        retryCount: 0
      };

      queue.push(queueItem);
      await this.saveSyncQueue(queue);
      
      return queueItem;
    } catch (error) {
      console.error('Failed to queue loan request:', error);
      throw error;
    }
  }

  /**
   * Get all unsync'd items in queue
   */
  async getUnsyncedQueue() {
    try {
      const queue = await this.getSyncQueue();
      return queue.filter(item => !item.synced);
    } catch (error) {
      console.error('Failed to get unsynced queue:', error);
      throw error;
    }
  }

  /**
   * Mark queue item as synced
   */
  async markAsSynced(itemId) {
    try {
      const queue = await this.getSyncQueue();
      const item = queue.find(q => q.id === itemId);
      
      if (item) {
        item.synced = true;
        item.syncedAt = Date.now();
        await this.saveSyncQueue(queue);
        return item;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to mark as synced:', error);
      throw error;
    }
  }

  /**
   * Increment retry count for queue item
   */
  async incrementRetryCount(itemId) {
    try {
      const queue = await this.getSyncQueue();
      const item = queue.find(q => q.id === itemId);
      
      if (item) {
        item.retryCount += 1;
        item.lastRetryAt = Date.now();
        await this.saveSyncQueue(queue);
        return item;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to increment retry count:', error);
      throw error;
    }
  }

  /**
   * Get sync queue
   */
  async getSyncQueue() {
    try {
      const data = await fs.readFile(SYNC_QUEUE_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // File doesn't exist yet
      }
      console.error('Failed to read sync queue:', error);
      throw error;
    }
  }

  /**
   * Save sync queue
   */
  async saveSyncQueue(queue) {
    try {
      await fs.writeFile(SYNC_QUEUE_FILE, JSON.stringify(queue, null, 2));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
      throw error;
    }
  }

  /**
   * Clear sync queue (after successful sync)
   */
  async clearSyncedItems() {
    try {
      const queue = await this.getSyncQueue();
      const unsyncedQueue = queue.filter(item => !item.synced);
      await this.saveSyncQueue(unsyncedQueue);
      return unsyncedQueue.length;
    } catch (error) {
      console.error('Failed to clear synced items:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const queue = await this.getSyncQueue();
      const synced = queue.filter(q => q.synced).length;
      const unsynced = queue.filter(q => !q.synced).length;

      return {
        totalItems: queue.length,
        syncedItems: synced,
        unsyncedItems: unsynced,
        items: queue
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      throw error;
    }
  }
}

module.exports = new USSDStorage();
