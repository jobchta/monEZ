/**
 * Ad-based Feature Unlock Service
 * Manages rewarded video ad flow and feature unlock tracking
 * Ready for AdMob/Meta Audience Network integration
 */

class AdUnlockService {
  constructor() {
    this.adProvider = null; // Will be AdMob or Meta Audience SDK
    this.userCredits = this.loadUserCredits();
    this.unlockHistory = this.loadUnlockHistory();
  }

  /**
   * Initialize ad provider (stub for now, ready for SDK integration)
   * @param {Object} config - Ad network configuration
   */
  async initializeAdProvider(config = {}) {
    // TODO: Replace with actual AdMob/Meta SDK initialization
    console.log('[AdUnlock] Initializing ad provider with config:', config);
    
    this.adProvider = {
      isReady: true,
      loadAd: this.mockLoadAd.bind(this),
      showAd: this.mockShowAd.bind(this),
      // Placeholder for real SDK methods:
      // AdMob: window.admob.rewardVideo.load()
      // Meta: window.FBAudienceNetwork.loadRewarded()
    };
    
    return Promise.resolve(this.adProvider);
  }

  /**
   * Mock ad loading (replace with real SDK)
   */
  async mockLoadAd() {
    console.log('[AdUnlock] Loading rewarded video ad...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { loaded: true, adId: 'mock-ad-' + Date.now() };
  }

  /**
   * Mock ad showing (replace with real SDK)
   */
  async mockShowAd() {
    console.log('[AdUnlock] Showing rewarded video ad...');
    // Simulate ad watching experience
    await new Promise(resolve => setTimeout(resolve, 3000));
    return { watched: true, reward: { type: 'feature_unlock', amount: 1 } };
  }

  /**
   * Watch ad to unlock a premium feature
   * @param {string} featureId - Feature identifier (e.g., 'ai_scan', 'extra_group', 'analytics')
   * @returns {Promise<Object>} Unlock result
   */
  async watchAdToUnlock(featureId) {
    try {
      // Load ad
      const ad = await this.adProvider.loadAd();
      
      if (!ad.loaded) {
        throw new Error('Ad failed to load');
      }

      // Show ad and wait for completion
      const result = await this.adProvider.showAd();
      
      if (result.watched) {
        // Grant unlock credits
        this.grantUnlockCredit(featureId);
        
        // Track analytics
        this.trackAdUnlock(featureId);
        
        return {
          success: true,
          featureId,
          message: 'Feature unlocked successfully!',
          expiresAt: this.getUnlockExpiry(featureId)
        };
      }
      
      return { success: false, message: 'Ad not completed' };
    } catch (error) {
      console.error('[AdUnlock] Error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Grant unlock credits to user
   */
  grantUnlockCredit(featureId) {
    const now = Date.now();
    const duration = this.getFeatureUnlockDuration(featureId);
    
    if (!this.userCredits[featureId]) {
      this.userCredits[featureId] = [];
    }
    
    this.userCredits[featureId].push({
      unlockedAt: now,
      expiresAt: now + duration,
      source: 'rewarded_video'
    });
    
    this.saveUserCredits();
  }

  /**
   * Check if feature is currently unlocked
   * @param {string} featureId - Feature identifier
   * @returns {boolean}
   */
  isFeatureUnlocked(featureId) {
    const credits = this.userCredits[featureId] || [];
    const now = Date.now();
    
    // Filter expired credits
    const activeCredits = credits.filter(c => c.expiresAt > now);
    
    if (activeCredits.length !== credits.length) {
      this.userCredits[featureId] = activeCredits;
      this.saveUserCredits();
    }
    
    return activeCredits.length > 0;
  }

  /**
   * Get remaining unlock time for feature
   * @param {string} featureId
   * @returns {number} Milliseconds remaining, or 0 if locked
   */
  getUnlockTimeRemaining(featureId) {
    const credits = this.userCredits[featureId] || [];
    const now = Date.now();
    
    const validCredits = credits.filter(c => c.expiresAt > now);
    if (validCredits.length === 0) return 0;
    
    // Return the longest remaining time
    return Math.max(...validCredits.map(c => c.expiresAt - now));
  }

  /**
   * Get unlock expiry timestamp
   */
  getUnlockExpiry(featureId) {
    const credits = this.userCredits[featureId] || [];
    if (credits.length === 0) return null;
    
    return Math.max(...credits.map(c => c.expiresAt));
  }

  /**
   * Feature-specific unlock durations (in milliseconds)
   */
  getFeatureUnlockDuration(featureId) {
    const durations = {
      'ai_scan': 24 * 60 * 60 * 1000, // 24 hours
      'extra_group': 7 * 24 * 60 * 60 * 1000, // 7 days
      'analytics': 3 * 24 * 60 * 60 * 1000, // 3 days
      'export_data': 24 * 60 * 60 * 1000, // 24 hours
      'custom_themes': 7 * 24 * 60 * 60 * 1000 // 7 days
    };
    
    return durations[featureId] || 24 * 60 * 60 * 1000; // Default 24h
  }

  /**
   * Track ad unlock event for analytics
   */
  trackAdUnlock(featureId) {
    const event = {
      eventType: 'ad_feature_unlock',
      featureId,
      timestamp: Date.now(),
      userId: this.getUserId()
    };
    
    this.unlockHistory.push(event);
    this.saveUnlockHistory();
    
    // Send to analytics backend
    this.sendAnalytics(event);
  }

  /**
   * Send analytics event
   */
  async sendAnalytics(event) {
    try {
      // TODO: Integrate with your analytics service
      console.log('[AdUnlock] Analytics event:', event);
      
      // Example: await fetch('/api/analytics', { method: 'POST', body: JSON.stringify(event) });
    } catch (error) {
      console.error('[AdUnlock] Analytics error:', error);
    }
  }

  /**
   * Local storage helpers
   */
  loadUserCredits() {
    try {
      const data = localStorage.getItem('ad_unlock_credits');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  saveUserCredits() {
    try {
      localStorage.setItem('ad_unlock_credits', JSON.stringify(this.userCredits));
    } catch (error) {
      console.error('[AdUnlock] Save error:', error);
    }
  }

  loadUnlockHistory() {
    try {
      const data = localStorage.getItem('ad_unlock_history');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveUnlockHistory() {
    try {
      // Keep only last 100 events
      const trimmed = this.unlockHistory.slice(-100);
      localStorage.setItem('ad_unlock_history', JSON.stringify(trimmed));
    } catch (error) {
      console.error('[AdUnlock] Save history error:', error);
    }
  }

  getUserId() {
    // TODO: Get actual user ID from auth service
    return localStorage.getItem('userId') || 'anonymous';
  }
}

// Singleton instance
const adUnlockService = new AdUnlockService();

export default adUnlockService;
