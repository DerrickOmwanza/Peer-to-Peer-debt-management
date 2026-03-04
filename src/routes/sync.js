/**
 * Sync Routes
 * Handles synchronization between offline clients and backend
 */

const express = require('express');
const router = express.Router();
const { SyncEngine, SyncQueueManager, IncrementalSyncManager } = require('../services/sync-engine');
const ussdLogic = require('../services/ussd-logic');

/**
 * POST /api/sync/full
 * Full synchronization for offline user
 */
router.post('/full', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Validate phone
    const validatedPhone = ussdLogic.validatePhoneNumber(phoneNumber);
    if (!validatedPhone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Perform full sync
    const syncResult = await SyncEngine.fullSync(validatedPhone);

    res.json(syncResult);

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Sync failed',
      message: error.message
    });
  }
});

/**
 * POST /api/sync/queue
 * Process sync queue
 */
router.post('/queue', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    const validatedPhone = ussdLogic.validatePhoneNumber(phoneNumber);
    if (!validatedPhone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const queueResult = await SyncEngine.processSyncQueue(validatedPhone);

    res.json({
      success: true,
      synced: queueResult.synced.length,
      failed: queueResult.failed.length,
      conflicts: queueResult.conflicts.length,
      total: queueResult.totalItems,
      duration: queueResult.duration,
      details: queueResult
    });

  } catch (error) {
    console.error('Queue processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Queue processing failed'
    });
  }
});

/**
 * GET /api/sync/pending/:phoneNumber
 * Get pending sync items for user
 */
router.get('/pending/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const validatedPhone = ussdLogic.validatePhoneNumber(phoneNumber);
    if (!validatedPhone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const pendingItems = await SyncQueueManager.getPendingSyncItems(validatedPhone);

    res.json({
      phoneNumber: validatedPhone,
      pendingCount: pendingItems.length,
      items: pendingItems.map(item => ({
        id: item.id,
        type: item.entity_type,
        operation: item.operation,
        retryCount: item.retry_count,
        createdAt: new Date(item.created_at),
        lastRetryAt: item.last_retry_at ? new Date(item.last_retry_at) : null
      }))
    });

  } catch (error) {
    console.error('Error getting pending items:', error);
    res.status(500).json({ error: 'Failed to get pending items' });
  }
});

/**
 * GET /api/sync/changes/:phoneNumber
 * Get changes since last sync
 */
router.get('/changes/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { since } = req.query;

    const validatedPhone = ussdLogic.validatePhoneNumber(phoneNumber);
    if (!validatedPhone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const lastSyncTime = since ? parseInt(since) : 
                        await IncrementalSyncManager.getLastSyncTimestamp(validatedPhone);

    const changes = await IncrementalSyncManager.getChangesSinceLastSync(validatedPhone, lastSyncTime);

    res.json({
      phoneNumber: validatedPhone,
      lastSync: new Date(lastSyncTime),
      changeCount: changes.length,
      changes: changes.map(change => ({
        type: change.entity_type,
        id: change.id,
        updatedAt: new Date(change.updated_at)
      }))
    });

  } catch (error) {
    console.error('Error getting changes:', error);
    res.status(500).json({ error: 'Failed to get changes' });
  }
});

/**
 * POST /api/sync/queue-operation
 * Add operation to sync queue (from offline client)
 */
router.post('/queue-operation', async (req, res) => {
  try {
    const { phoneNumber, entityType, operation, data } = req.body;

    if (!phoneNumber || !entityType || !operation || !data) {
      return res.status(400).json({ 
        error: 'Missing required fields: phoneNumber, entityType, operation, data' 
      });
    }

    const validatedPhone = ussdLogic.validatePhoneNumber(phoneNumber);
    if (!validatedPhone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const queueItem = await SyncQueueManager.queueOperation(
      entityType,
      operation,
      data,
      validatedPhone
    );

    res.json({
      success: true,
      message: 'Operation queued for sync',
      queueItem: {
        id: queueItem.id,
        type: queueItem.entity_type,
        operation: queueItem.operation,
        createdAt: new Date(queueItem.created_at)
      }
    });

  } catch (error) {
    console.error('Error queuing operation:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to queue operation' 
    });
  }
});

/**
 * POST /api/sync/dead-letter
 * Get dead-letter queue items (max retries exceeded)
 */
router.post('/dead-letter', async (req, res) => {
  try {
    const { phoneNumber, maxRetries } = req.body;

    const validatedPhone = ussdLogic.validatePhoneNumber(phoneNumber);
    if (!validatedPhone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const deadLetterItems = await SyncQueueManager.getDeadLetterQueue(maxRetries || 5);

    res.json({
      phoneNumber: validatedPhone,
      deadLetterCount: deadLetterItems.length,
      items: deadLetterItems.map(item => ({
        id: item.id,
        type: item.entity_type,
        operation: item.operation,
        retryCount: item.retry_count,
        error: item.error_message,
        lastRetryAt: item.last_retry_at ? new Date(item.last_retry_at) : null
      }))
    });

  } catch (error) {
    console.error('Error getting dead letter queue:', error);
    res.status(500).json({ error: 'Failed to get dead letter queue' });
  }
});

/**
 * GET /api/sync/status/:phoneNumber
 * Get overall sync status for user
 */
router.get('/status/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const validatedPhone = ussdLogic.validatePhoneNumber(phoneNumber);
    if (!validatedPhone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const pendingItems = await SyncQueueManager.getPendingSyncItems(validatedPhone);
    const lastSync = await IncrementalSyncManager.getLastSyncTimestamp(validatedPhone);

    res.json({
      phoneNumber: validatedPhone,
      syncStatus: {
        lastSyncAt: lastSync ? new Date(lastSync) : 'Never',
        pendingOperations: pendingItems.length,
        oldestPendingAt: pendingItems.length > 0 ? 
                        new Date(pendingItems[0].created_at) : null
      }
    });

  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

/**
 * POST /api/sync/test
 * Test sync operation with sample data
 */
router.post('/test', async (req, res) => {
  try {
    const { phoneNumber, operation } = req.body;

    const validatedPhone = ussdLogic.validatePhoneNumber(phoneNumber);
    if (!validatedPhone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Create test loan for syncing
    const testData = {
      borrowerPhone: validatedPhone,
      lenderPhone: '254702345678',
      amount: 1000,
      repaymentAmount: 100
    };

    const queueItem = await SyncQueueManager.queueOperation(
      'loans',
      operation || 'CREATE',
      testData,
      validatedPhone
    );

    res.json({
      success: true,
      message: 'Test operation queued',
      queueItem
    });

  } catch (error) {
    console.error('Test sync error:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

module.exports = router;
