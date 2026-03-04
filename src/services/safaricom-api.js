/**
 * Safaricom API Client
 * Handles all M-PESA API integrations with Safaricom
 * - OAuth token management
 * - STK Push for payments
 * - Transaction queries
 * - Request signing
 */

const axios = require('axios');
const crypto = require('crypto');

class SafaricomAPI {
  constructor(config) {
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.businessShortCode = config.businessShortCode;
    this.passkey = config.passkey;
    this.callbackUrl = config.callbackUrl;
    
    // Environment
    this.isSandbox = config.isSandbox !== false;
    this.baseUrl = this.isSandbox 
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';
    
    // Token management
    this.token = null;
    this.tokenExpiry = 0;
    
    // Axios instance
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000
    });
  }

  /**
   * Get OAuth2 access token
   */
  async getAccessToken() {
    try {
      // Return cached token if still valid
      if (this.token && Date.now() < this.tokenExpiry) {
        return this.token;
      }

      // Get new token
      const auth = Buffer.from(
        `${this.consumerKey}:${this.consumerSecret}`
      ).toString('base64');

      const response = await this.client.get('/oauth/v1/generate', {
        headers: {
          'Authorization': `Basic ${auth}`
        },
        params: {
          grant_type: 'client_credentials'
        }
      });

      // Cache token (expires in ~3600 seconds, cache for 3500)
      this.token = response.data.access_token;
      this.tokenExpiry = Date.now() + 3500000;

      console.log('[Safaricom] Got access token');
      return this.token;

    } catch (error) {
      console.error('Failed to get access token:', error.message);
      throw new Error('Token generation failed: ' + error.message);
    }
  }

  /**
   * STK Push - Trigger M-PESA prompt on user's phone
   * Used for payment collection
   */
  async stkPush(phoneNumber, amount, description, accountRef) {
    try {
      const token = await this.getAccessToken();

      // Generate timestamp
      const timestamp = this.getTimestamp();

      // Generate password (base64 of ShortCode + Passkey + Timestamp)
      const password = this.generatePassword(timestamp);

      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount), // Round to nearest KES
        PartyA: this.formatPhoneNumber(phoneNumber),
        PartyB: this.businessShortCode,
        PhoneNumber: this.formatPhoneNumber(phoneNumber),
        CallBackURL: this.callbackUrl,
        AccountReference: accountRef,
        TransactionDesc: description
      };

      const response = await this.client.post(
        '/mpesa/stkpush/v1/processrequest',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[Safaricom] STK Push sent:', {
        phone: phoneNumber,
        amount: amount,
        ref: accountRef,
        checkoutId: response.data.CheckoutRequestID
      });

      return {
        success: true,
        checkoutRequestId: response.data.CheckoutRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        merchantRequestId: response.data.MerchantRequestID,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('STK Push failed:', error.message);
      return {
        success: false,
        error: error.message,
        responseCode: error.response?.data?.errorCode || 'UNKNOWN'
      };
    }
  }

  /**
   * Query STK Push Status
   * Check if user has completed the payment
   */
  async querySTKStatus(merchantRequestId, checkoutRequestId) {
    try {
      const token = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);

      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await this.client.post(
        '/mpesa/stkpushquery/v1/query',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const status = response.data.ResultCode === '0' ? 'success' : 'pending';

      console.log('[Safaricom] STK Status:', {
        checkoutId: checkoutRequestId,
        status: status,
        resultCode: response.data.ResultCode
      });

      return {
        success: response.data.ResultCode === '0',
        status: status,
        resultCode: response.data.ResultCode,
        resultDescription: response.data.ResultDescription,
        merchantRequestId: response.data.MerchantRequestID,
        checkoutRequestId: response.data.CheckoutRequestID
      };

    } catch (error) {
      console.error('STK Status query failed:', error.message);
      return {
        success: false,
        status: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * B2C Payment - Send money to customer
   * Used for loan disbursement
   */
  async b2cPayment(phoneNumber, amount, description, commandId = 'SalaryPayment') {
    try {
      const token = await this.getAccessToken();

      const payload = {
        OriginatorConversationID: this.generateConversationId(),
        InitiatedName: 'M-PESA Loans',
        SecurityCredential: this.encryptSecurityCredential(),
        CommandID: commandId,
        Description: description,
        Amount: Math.round(amount),
        PartyB: this.formatPhoneNumber(phoneNumber),
        ResultURL: `${this.callbackUrl}/b2c/result`,
        QueueTimeOutURL: `${this.callbackUrl}/b2c/timeout`,
        Remarks: 'Loan Disbursement'
      };

      const response = await this.client.post(
        '/mpesa/b2c/v1/paymentrequest',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[Safaricom] B2C Payment initiated:', {
        phone: phoneNumber,
        amount: amount,
        ref: payload.OriginatorConversationID
      });

      return {
        success: true,
        conversationId: response.data.OriginatorConversationID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('B2C Payment failed:', error.message);
      return {
        success: false,
        error: error.message,
        responseCode: error.response?.data?.errorCode || 'UNKNOWN'
      };
    }
  }

  /**
   * C2B Register URLs - Register callback endpoints
   * Called once during setup
   */
  async registerC2BUrls(validationUrl, confirmationUrl) {
    try {
      const token = await this.getAccessToken();

      const payload = {
        ShortCode: this.businessShortCode,
        ResponseType: 'Completed',
        ConfirmationURL: confirmationUrl,
        ValidationURL: validationUrl
      };

      const response = await this.client.post(
        '/mpesa/c2b/v1/registerurl',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[Safaricom] C2B URLs registered');

      return {
        success: true,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription
      };

    } catch (error) {
      console.error('C2B URL registration failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate C2B Payment
   * Called when payment received, before confirmation
   */
  validatePayment(transactionData) {
    try {
      // Validation logic - return 0 to accept
      const { MSISDN, Amount, TransID, BillRefNumber } = transactionData;

      console.log('[Safaricom] Validating payment:', {
        phone: MSISDN,
        amount: Amount,
        transactionId: TransID,
        reference: BillRefNumber
      });

      // TODO: Add custom validation logic
      // Return 0 to accept, 1 to reject

      return {
        ResultCode: 0,
        ResultDesc: 'Validation accepted'
      };

    } catch (error) {
      console.error('Payment validation failed:', error.message);
      return {
        ResultCode: 1,
        ResultDesc: 'Validation failed'
      };
    }
  }

  /**
   * Handle Confirmation Callback
   * Called after payment is confirmed
   */
  handleConfirmation(transactionData) {
    try {
      const {
        MSISDN,
        Amount,
        TransID,
        BillRefNumber,
        ReceiptNo,
        TransTime
      } = transactionData;

      console.log('[Safaricom] Payment confirmed:', {
        phone: MSISDN,
        amount: Amount,
        transactionId: TransID,
        reference: BillRefNumber,
        receipt: ReceiptNo,
        time: TransTime
      });

      // Return success
      return {
        ResultCode: 0,
        ResultDesc: 'Confirmation received'
      };

    } catch (error) {
      console.error('Confirmation handling failed:', error.message);
      return {
        ResultCode: 1,
        ResultDesc: 'Confirmation failed'
      };
    }
  }

  /**
   * Account Balance Query
   * Get current M-PESA account balance
   */
  async getAccountBalance() {
    try {
      const token = await this.getAccessToken();

      const payload = {
        CommandID: 'GetAccountBalance',
        Initiator: 'testuser',
        SecurityCredential: this.encryptSecurityCredential(),
        PartyA: this.businessShortCode,
        IdentifierType: '4',
        Remarks: 'Balance query',
        QueueURL: `${this.callbackUrl}/balance/queue`,
        ResultURL: `${this.callbackUrl}/balance/result`
      };

      const response = await this.client.post(
        '/mpesa/accountbalance/v1/query',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[Safaricom] Balance query initiated');

      return {
        success: true,
        conversationId: response.data.ConversationID,
        originator: response.data.OriginatorConversationID
      };

    } catch (error) {
      console.error('Balance query failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Transaction Reversal
   * Reverse a failed or incorrect transaction
   */
  async reverseTransaction(transactionId, amount, reason) {
    try {
      const token = await this.getAccessToken();

      const payload = {
        CommandID: 'TransactionReversal',
        Initiator: 'testuser',
        SecurityCredential: this.encryptSecurityCredential(),
        TransactionID: transactionId,
        Amount: Math.round(amount),
        ReceiverParty: this.businessShortCode,
        RecieverIdentifierType: '4',
        Remarks: reason,
        QueueURL: `${this.callbackUrl}/reversal/queue`,
        ResultURL: `${this.callbackUrl}/reversal/result`
      };

      const response = await this.client.post(
        '/mpesa/reversal/v1/request',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[Safaricom] Reversal initiated:', {
        transactionId: transactionId,
        amount: amount,
        reason: reason
      });

      return {
        success: true,
        conversationId: response.data.ConversationID,
        originator: response.data.OriginatorConversationID
      };

    } catch (error) {
      console.error('Reversal failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Transaction Status Query
   * Query status of a transaction by ID
   */
  async getTransactionStatus(transactionId) {
    try {
      const token = await this.getAccessToken();

      const payload = {
        CommandID: 'TransactionStatusQuery',
        Initiator: 'testuser',
        SecurityCredential: this.encryptSecurityCredential(),
        TransactionID: transactionId,
        PartyA: this.businessShortCode,
        IdentifierType: '4',
        ResultURL: `${this.callbackUrl}/status/result`,
        QueueURL: `${this.callbackUrl}/status/queue`,
        Remarks: 'Status query'
      };

      const response = await this.client.post(
        '/mpesa/transactionstatus/v1/query',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[Safaricom] Status query initiated');

      return {
        success: true,
        conversationId: response.data.ConversationID,
        originator: response.data.OriginatorConversationID
      };

    } catch (error) {
      console.error('Status query failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Helper: Generate timestamp
   */
  getTimestamp() {
    const date = new Date();
    return date.toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
  }

  /**
   * Helper: Generate password (base64 encoded)
   */
  generatePassword(timestamp) {
    const str = this.businessShortCode + this.passkey + timestamp;
    return Buffer.from(str).toString('base64');
  }

  /**
   * Helper: Format phone number to Safaricom format
   */
  formatPhoneNumber(phone) {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Convert to 254XXXXXXXXX format
    if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
      return cleaned;
    } else {
      return '254' + cleaned;
    }
  }

  /**
   * Helper: Generate conversation ID
   */
  generateConversationId() {
    return `MPESA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Encrypt security credential
   * NOTE: In production, use actual M-PESA certificate
   */
  encryptSecurityCredential() {
    // This is a placeholder - in production:
    // 1. Get Safaricom's public certificate
    // 2. Use it to encrypt the initiator password
    // For now, return base64 of test password
    return Buffer.from('test_password').toString('base64');
  }

  /**
   * Verify Safaricom Signature
   * Verify that callbacks are genuine from Safaricom
   */
  verifySignature(signature, data) {
    try {
      // NOTE: In production, verify against Safaricom's public key
      // This is a simplified version
      
      const hash = crypto
        .createHash('sha256')
        .update(data)
        .digest('hex');

      return signature === hash;

    } catch (error) {
      console.error('Signature verification failed:', error.message);
      return false;
    }
  }
}

module.exports = SafaricomAPI;
