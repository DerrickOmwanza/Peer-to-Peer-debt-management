/**
 * USSD Routes
 * Handles all USSD API endpoints for *383# access
 */

const express = require('express');
const router = express.Router();
const ussdLogic = require('../services/ussd-logic');
const ussdSession = require('../services/ussd-session');
const ussdMenu = require('../services/ussd-menu');
const ussdStorage = require('../services/ussd-storage');

/**
 * POST /api/ussd/handler
 * Main USSD handler - processes incoming USSD requests from Safaricom
 * 
 * Expected request body:
 * {
 *   "sessionId": "string",
 *   "phoneNumber": "string",
 *   "text": "string (user input)",
 *   "serviceCode": "string"
 * }
 */
router.post('/handler', async (req, res) => {
  try {
    const {
      sessionId,
      phoneNumber,
      text,
      serviceCode
    } = req.body;

    // Validate required fields
    if (!sessionId || !phoneNumber) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, phoneNumber'
      });
    }

    // Validate phone number
    const validatedPhone = ussdLogic.validatePhoneNumber(phoneNumber);
    if (!validatedPhone) {
      return res.json({
        responseType: 'notification',
        message: ussdMenu.getErrorMenu('Invalid phone number')
      });
    }

    // Get or create session
    const session = ussdSession.getOrCreateSession(sessionId, validatedPhone);

    // Check if this is the first request (session just created)
    const isFirstRequest = !session.data || Object.keys(session.data).length === 0;

    // Get or create user
    let user = await ussdLogic.getUserByPhone(validatedPhone);

    // If user doesn't exist, create one (auto-register)
    if (!user) {
      // For USSD, we auto-create basic user account
      const db = require('../config/database');
      const userResult = await db.query(`
        INSERT INTO users (phone, name, email, wallet_balance)
        VALUES ($1, $2, $3, $4)
        RETURNING id, phone, name, email, wallet_balance
      `, [validatedPhone, `User ${validatedPhone.slice(-4)}`, null, 0]);
      
      user = userResult.rows[0];
    }

    // Process the input
    const result = await ussdLogic.processUSSDInput(session, text, user);

    // Determine response type
    const responseType = result.continueSession ? 'input' : 'notification';

    // Return response in Safaricom format
    res.json({
      responseType: responseType,
      message: result.message
    });

  } catch (error) {
    console.error('USSD handler error:', error);
    res.status(500).json({
      responseType: 'notification',
      message: ussdMenu.getErrorMenu('System error. Please try again.')
    });
  }
});

/**
 * POST /api/ussd/sync
 * Sync offline data with backend when user comes online
 * Used by mobile clients to push queued transactions
 */
router.post('/sync', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Validate phone
    const validatedPhone = ussdLogic.validatePhoneNumber(phoneNumber);
    if (!validatedPhone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Get unsync'd items
    const unsyncedQueue = await ussdStorage.getUnsyncedQueue();
    const userQueue = unsyncedQueue.filter(item => item.phoneNumber === validatedPhone);

    if (userQueue.length === 0) {
      return res.json({
        success: true,
        message: 'No items to sync',
        synced: 0
      });
    }

    let syncedCount = 0;
    const errors = [];

    // Process each queued item
    for (const queueItem of userQueue) {
      try {
        const user = await ussdLogic.getUserByPhone(validatedPhone);
        if (!user) {
          throw new Error('User not found');
        }

        if (queueItem.type === 'LOAN_REQUEST') {
          const { lenderPhone, amount, repaymentAmount } = queueItem.data;
          await ussdLogic.createLoanRequest(
            user.id,
            lenderPhone,
            amount,
            repaymentAmount
          );
        } else if (queueItem.type === 'TRANSACTION') {
          // Handle transaction sync if needed
          // Implementation depends on your transaction logic
        }

        // Mark as synced
        await ussdStorage.markAsSynced(queueItem.id);
        syncedCount++;

      } catch (itemError) {
        console.error(`Failed to sync item ${queueItem.id}:`, itemError);
        
        // Increment retry count
        await ussdStorage.incrementRetryCount(queueItem.id);
        
        errors.push({
          itemId: queueItem.id,
          error: itemError.message
        });
      }
    }

    // Clear synced items
    await ussdStorage.clearSyncedItems();

    res.json({
      success: true,
      synced: syncedCount,
      total: userQueue.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Sync failed'
    });
  }
});

/**
 * GET /api/ussd/queue/:phoneNumber
 * Get user's sync queue status
 */
router.get('/queue/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const validatedPhone = ussdLogic.validatePhoneNumber(phoneNumber);
    if (!validatedPhone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const queueStats = await ussdStorage.getQueueStats();
    const userQueue = queueStats.items.filter(item => item.phoneNumber === validatedPhone);

    res.json({
      phoneNumber: validatedPhone,
      totalItems: userQueue.length,
      syncedItems: userQueue.filter(q => q.synced).length,
      unsyncedItems: userQueue.filter(q => !q.synced).length,
      items: userQueue
    });

  } catch (error) {
    console.error('Queue error:', error);
    res.status(500).json({ error: 'Failed to get queue' });
  }
});

/**
 * POST /api/ussd/test
 * Test endpoint for USSD simulation (development only)
 * Allows testing USSD flows without Safaricom integration
 */
router.post('/test', async (req, res) => {
  try {
    const { sessionId, phoneNumber, text } = req.body;

    if (!sessionId || !phoneNumber) {
      return res.status(400).json({ error: 'Missing sessionId or phoneNumber' });
    }

    // Use the main handler
    const session = ussdSession.getOrCreateSession(sessionId, phoneNumber);
    const user = await ussdLogic.getUserByPhone(phoneNumber) || {
      id: 'test-user',
      phone: phoneNumber,
      name: 'Test User',
      wallet_balance: 5000
    };

    const result = await ussdLogic.processUSSDInput(session, text, user);

    res.json({
      sessionId,
      phoneNumber,
      state: session.state,
      message: result.message,
      continueSession: result.continueSession
    });

  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ussd/sessions
 * Get active sessions (for monitoring/debugging)
 */
router.get('/sessions', (req, res) => {
  const stats = ussdSession.getSessionStats();
  res.json(stats);
});

/**
 * POST /api/ussd/sessions/clear
 * Clear all sessions (for testing/maintenance)
 */
router.post('/sessions/clear', (req, res) => {
  ussdSession.clearAllSessions();
  res.json({ message: 'All sessions cleared' });
});

/**
 * GET /api/ussd/health
 * Health check for USSD service
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'USSD service is running',
    timestamp: new Date(),
    activeSessions: ussdSession.sessionStore.size
  });
});

module.exports = router;
