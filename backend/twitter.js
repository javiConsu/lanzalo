/**
 * Twitter Integration
 * Handles posting tweets via Twitter API
 */

const { TwitterApi } = require('twitter-api-v2');

// Initialize Twitter client (if credentials configured)
let twitterClient = null;

if (process.env.TWITTER_API_KEY && 
    process.env.TWITTER_API_SECRET && 
    process.env.TWITTER_ACCESS_TOKEN && 
    process.env.TWITTER_ACCESS_SECRET) {
  
  twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });
  
  console.log('[Twitter] Client initialized');
} else {
  console.log('[Twitter] Not configured (missing credentials)');
}

/**
 * Post a tweet
 * @param {string} text - Tweet content (max 280 chars)
 * @param {object} options - Optional media, reply_to, etc.
 * @returns {Promise<object>} Tweet response or mock
 */
async function postTweet(text, options = {}) {
  if (!twitterClient) {
    console.log('[Twitter] Skipping (not configured):', text.substring(0, 50) + '...');
    return {
      success: false,
      mock: true,
      text,
      message: 'Twitter API not configured'
    };
  }

  try {
    const tweetParams = { text };
    
    // Add media if provided
    if (options.mediaIds && options.mediaIds.length > 0) {
      tweetParams.media = { media_ids: options.mediaIds };
    }
    
    // Reply to another tweet
    if (options.replyTo) {
      tweetParams.reply = { in_reply_to_tweet_id: options.replyTo };
    }
    
    const response = await twitterClient.v2.tweet(tweetParams);
    
    console.log('[Twitter] Tweet posted:', response.data.id);
    
    return {
      success: true,
      tweetId: response.data.id,
      text: response.data.text,
      url: `https://twitter.com/user/status/${response.data.id}`
    };
    
  } catch (error) {
    console.error('[Twitter] Error posting tweet:', error);
    
    return {
      success: false,
      error: error.message,
      text
    };
  }
}

/**
 * Upload media (image, video, gif)
 * @param {Buffer|string} media - File buffer or path
 * @returns {Promise<string>} Media ID
 */
async function uploadMedia(media) {
  if (!twitterClient) {
    throw new Error('Twitter API not configured');
  }

  try {
    const mediaId = await twitterClient.v1.uploadMedia(media);
    console.log('[Twitter] Media uploaded:', mediaId);
    return mediaId;
  } catch (error) {
    console.error('[Twitter] Error uploading media:', error);
    throw error;
  }
}

/**
 * Get user's own tweets
 * @param {number} count - Number of tweets to fetch
 * @returns {Promise<Array>} Array of tweets
 */
async function getOwnTweets(count = 10) {
  if (!twitterClient) {
    return [];
  }

  try {
    const me = await twitterClient.v2.me();
    const tweets = await twitterClient.v2.userTimeline(me.data.id, {
      max_results: count
    });
    
    return tweets.data.data || [];
  } catch (error) {
    console.error('[Twitter] Error fetching tweets:', error);
    return [];
  }
}

/**
 * Delete a tweet
 * @param {string} tweetId - Tweet ID to delete
 * @returns {Promise<boolean>} Success status
 */
async function deleteTweet(tweetId) {
  if (!twitterClient) {
    return false;
  }

  try {
    await twitterClient.v2.deleteTweet(tweetId);
    console.log('[Twitter] Tweet deleted:', tweetId);
    return true;
  } catch (error) {
    console.error('[Twitter] Error deleting tweet:', error);
    return false;
  }
}

module.exports = {
  postTweet,
  uploadMedia,
  getOwnTweets,
  deleteTweet
};
