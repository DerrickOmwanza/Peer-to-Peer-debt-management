/**
 * USSD Session Manager
 * Handles session state, timeout, and data persistence for USSD interactions
 */

const sessionStore = new Map();
const SESSION_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds

class USSDSession {
  constructor(sessionId, phoneNumber) {
    this.sessionId = sessionId;
    this.phoneNumber = phoneNumber;
    this.state = 'MAIN_MENU';
    this.data = {};
    this.createdAt = Date.now();
    this.lastActivityAt = Date.now();
    this.timeoutHandle = null;
    
    // Auto-timeout after SESSION_TIMEOUT
    this.setAutoTimeout();
  }

  setAutoTimeout() {
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    
    this.timeoutHandle = setTimeout(() => {
      sessionStore.delete(this.sessionId);
      console.log(`Session ${this.sessionId} expired`);
    }, SESSION_TIMEOUT);
  }

  updateActivity() {
    this.lastActivityAt = Date.now();
    this.setAutoTimeout();
  }

  setState(newState) {
    this.state = newState;
    this.updateActivity();
  }

  setData(key, value) {
    this.data[key] = value;
    this.updateActivity();
  }

  getData(key) {
    return this.data[key];
  }

  getAllData() {
    return { ...this.data };
  }

  clearData() {
    this.data = {};
    this.updateActivity();
  }

  reset() {
    this.state = 'MAIN_MENU';
    this.data = {};
    this.lastActivityAt = Date.now();
    this.setAutoTimeout();
  }

  destroy() {
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    sessionStore.delete(this.sessionId);
  }
}

/**
 * Get or create a session
 */
function getOrCreateSession(sessionId, phoneNumber) {
  let session = sessionStore.get(sessionId);
  
  if (!session) {
    session = new USSDSession(sessionId, phoneNumber);
    sessionStore.set(sessionId, session);
  } else {
    session.updateActivity();
  }
  
  return session;
}

/**
 * Get existing session
 */
function getSession(sessionId) {
  return sessionStore.get(sessionId);
}

/**
 * Delete a session
 */
function deleteSession(sessionId) {
  const session = sessionStore.get(sessionId);
  if (session) {
    session.destroy();
    return true;
  }
  return false;
}

/**
 * Get session statistics (for debugging/monitoring)
 */
function getSessionStats() {
  return {
    activeSessions: sessionStore.size,
    sessions: Array.from(sessionStore.entries()).map(([id, session]) => ({
      sessionId: id,
      phoneNumber: session.phoneNumber,
      state: session.state,
      createdAt: new Date(session.createdAt),
      lastActivityAt: new Date(session.lastActivityAt),
      idleTime: Date.now() - session.lastActivityAt
    }))
  };
}

/**
 * Clear all sessions (useful for testing/maintenance)
 */
function clearAllSessions() {
  sessionStore.forEach((session) => session.destroy());
  sessionStore.clear();
  console.log('All sessions cleared');
}

module.exports = {
  USSDSession,
  getOrCreateSession,
  getSession,
  deleteSession,
  getSessionStats,
  clearAllSessions,
  sessionStore
};
