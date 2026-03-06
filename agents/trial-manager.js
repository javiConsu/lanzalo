/**
 * Trial Manager
 * 
 * Manages trial expirations and downgrades
 * Runs daily to check expired trials
 */

const cron = require('node-cron');
const { pool } = require('../backend/db');

/**
 * Schedule trial checks
 * Runs daily at 9 AM
 */
function scheduleTrialChecks() {
  // Run daily at 9:00
  cron.schedule('0 9 * * *', async () => {
    console.log('[Trial Manager] Checking for expired trials...');
    
    try {
      await checkExpiredTrials();
    } catch (error) {
      console.error('[Trial Manager] Error checking trials:', error);
    }
  });
  
  console.log('[Trial Manager] Scheduled (runs daily at 9 AM)');
}

/**
 * Check and downgrade expired trials
 */
async function checkExpiredTrials() {
  // Find users with expired trials
  const result = await pool.query(
    `SELECT id, email, name, trial_ends_at 
     FROM users 
     WHERE plan = 'trial' 
       AND trial_ends_at <= NOW()`
  );
  
  const expiredUsers = result.rows || [];
  
  if (expiredUsers.length === 0) {
    console.log('[Trial Manager] No expired trials');
    return;
  }
  
  console.log(`[Trial Manager] Found ${expiredUsers.length} expired trials`);
  
  for (const user of expiredUsers) {
    try {
      await downgradeToFree(user);
    } catch (error) {
      console.error(`[Trial Manager] Error downgrading user ${user.id}:`, error);
    }
  }
  
  console.log(`[Trial Manager] Processed ${expiredUsers.length} expirations`);
}

/**
 * Downgrade user from trial to free
 */
async function downgradeToFree(user) {
  console.log(`[Trial Manager] Downgrading ${user.email} to Free plan`);
  
  // Update user plan
  await pool.query(
    `UPDATE users 
     SET plan = 'free', 
         trial_ends_at = NULL 
     WHERE id = $1`,
    [user.id]
  );
  
  // TODO: Send downgrade email
  console.log(`[Trial Manager] Email would be sent to ${user.email}`);
  
  // Log event
  console.log(`[Trial Manager] ${user.email} downgraded to Free (trial expired ${user.trial_ends_at})`);
}

/**
 * Send trial reminder emails
 * Runs daily to check for upcoming expirations
 */
async function sendTrialReminders() {
  const now = new Date();
  
  // Check for trials expiring in 3, 2, 1 days
  for (const daysLeft of [3, 2, 1]) {
    const targetDate = new Date(now.getTime() + daysLeft * 24 * 60 * 60 * 1000);
    
    const result = await pool.query(
      `SELECT id, email, name, trial_ends_at 
       FROM users 
       WHERE plan = 'trial' 
         AND DATE(trial_ends_at) = DATE($1)`,
      [targetDate.toISOString().split('T')[0]]
    );
    
    const users = result.rows || [];
    
    if (users.length > 0) {
      console.log(`[Trial Manager] ${users.length} users have ${daysLeft} day(s) left`);
      
      for (const user of users) {
        // TODO: Send reminder email
        console.log(`[Trial Manager] Reminder email (${daysLeft} days) would be sent to ${user.email}`);
      }
    }
  }
}

/**
 * Schedule reminder emails
 * Runs daily at 10 AM
 */
function scheduleTrialReminders() {
  cron.schedule('0 10 * * *', async () => {
    console.log('[Trial Manager] Checking for trial reminders...');
    
    try {
      await sendTrialReminders();
    } catch (error) {
      console.error('[Trial Manager] Error sending reminders:', error);
    }
  });
  
  console.log('[Trial Manager] Reminder scheduler started (runs daily at 10 AM)');
}

/**
 * Get trial stats
 */
async function getTrialStats() {
  const result = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE plan = 'trial') as active_trials,
      COUNT(*) FILTER (WHERE plan = 'trial' AND trial_ends_at <= NOW() + INTERVAL '3 days') as expiring_soon,
      COUNT(*) FILTER (WHERE plan = 'free' AND trial_ends_at IS NOT NULL) as expired_trials
    FROM users
  `);
  
  return result.rows[0];
}

module.exports = {
  scheduleTrialChecks,
  scheduleTrialReminders,
  checkExpiredTrials,
  getTrialStats
};
