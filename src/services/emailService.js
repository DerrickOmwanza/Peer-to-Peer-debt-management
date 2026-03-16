/**
 * Email Service
 * Handles sending loan agreements and notifications via email
 */

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Configure transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send loan agreement email
 * @param {string} toEmail - Recipient email address
 * @param {object} loanData - Loan details
 * @param {string} agreementText - Full agreement text
 * @returns {Promise}
 */
async function sendAgreementEmail(toEmail, loanData, agreementText) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('[Email] Skipping email send - No credentials provided');
      return { success: false, message: 'Email credentials not configured' };
    }

    const { borrowerName, lenderName, amount, repaymentAmount, repaymentDate } = loanData;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #2c3e50; text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Loan Agreement Confirmation</h2>
        <p>Hello,</p>
        <p>A new loan request has been initiated and a legally binding agreement has been generated.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2980b9;">Loan Summary</h3>
          <p><strong>Borrower:</strong> ${borrowerName}</p>
          <p><strong>Lender:</strong> ${lenderName}</p>
          <p><strong>Principal Amount:</strong> Ksh ${amount}</p>
          <p><strong>Total Repayment:</strong> Ksh ${repaymentAmount}</p>
          <p><strong>Repayment Start Date:</strong> ${repaymentDate}</p>
        </div>

        <h3 style="color: #2c3e50;">Full Agreement Text</h3>
        <div style="white-space: pre-wrap; background-color: #fff; border: 1px solid #eee; padding: 15px; font-size: 13px; max-height: 300px; overflow-y: auto;">
          ${agreementText}
        </div>

        <p style="margin-top: 20px; font-size: 12px; color: #777;">
          This agreement is legally binding under the laws of the Republic of Kenya. Both parties are advised to keep this copy for their records. 
          In case of default, this document can be used as evidence in a court of law.
        </p>
        
        <footer style="margin-top: 30px; text-align: center; font-size: 11px; color: #aaa;">
          Sent by P2P Debt Management System &copy; ${new Date().getFullYear()}
        </footer>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"P2P Loans" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Loan Agreement: Ksh ${amount} (${borrowerName} to ${lenderName})`,
      html: htmlContent,
    });

    console.log('[Email] Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendAgreementEmail,
};
