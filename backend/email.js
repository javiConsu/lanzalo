/**
 * backend/email.js
 * Re-exports email functions from services/email-service
 */
const emailService = require('./services/email-service');

const sendEmail = emailService.sendEmail || emailService.sendWelcomeEmail || async function() { return { success: false }; };

module.exports = { sendEmail };
