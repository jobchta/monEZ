import React, { useState, useEffect } from 'react';
import adUnlockService from '../services/adUnlockService';
import './AdUnlockModal.css';

/**
 * Ad Unlock Modal Component
 * Shows "Watch Ad to Unlock" screen for premium features
 */
const AdUnlockModal = ({ 
  featureId, 
  featureName, 
  featureIcon,
  featureDescription,
  onUnlock, 
  onClose 
}) => {
  const [isWatching, setIsWatching] = useState(false);
  const [unlockStatus, setUnlockStatus] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if feature is already unlocked
    const isUnlocked = adUnlockService.isFeatureUnlocked(featureId);
    if (isUnlocked) {
      const remaining = adUnlockService.getUnlockTimeRemaining(featureId);
      setTimeRemaining(remaining);
      setUnlockStatus('unlocked');
    }
  }, [featureId]);

  useEffect(() => {
    // Update timer every second if unlocked
    if (unlockStatus === 'unlocked' && timeRemaining > 0) {
      const timer = setInterval(() => {
        const remaining = adUnlockService.getUnlockTimeRemaining(featureId);
        if (remaining <= 0) {
          setUnlockStatus(null);
          setTimeRemaining(0);
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [unlockStatus, timeRemaining, featureId]);

  const handleWatchAd = async () => {
    setIsWatching(true);
    setError(null);

    try {
      const result = await adUnlockService.watchAdToUnlock(featureId);
      
      if (result.success) {
        setUnlockStatus('unlocked');
        const remaining = adUnlockService.getUnlockTimeRemaining(featureId);
        setTimeRemaining(remaining);
        
        // Notify parent component
        if (onUnlock) {
          onUnlock(result);
        }
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          if (onClose) onClose();
        }, 2000);
      } else {
        setError(result.message || 'Failed to unlock feature');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsWatching(false);
    }
  };

  const formatTimeRemaining = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const getFeatureDurationText = () => {
    const duration = adUnlockService.getFeatureUnlockDuration(featureId);
    return formatTimeRemaining(duration);
  };

  return (
    <div className="ad-unlock-overlay" onClick={onClose}>
      <div className="ad-unlock-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="modal-content">
          {unlockStatus === 'unlocked' ? (
            // Success state
            <div className="unlock-success">
              <div className="success-icon">✓</div>
              <h2>Feature Unlocked!</h2>
              <p className="feature-name">{featureName}</p>
              <p className="time-remaining">
                Available for: <strong>{formatTimeRemaining(timeRemaining)}</strong>
              </p>
              <button className="action-button primary" onClick={onClose}>
                Start Using
              </button>
            </div>
          ) : (
            // Lock state
            <div className="unlock-prompt">
              <div className="feature-icon">
                {featureIcon || '🔒'}
              </div>
              
              <h2>Premium Feature</h2>
              <p className="feature-name">{featureName}</p>
              
              {featureDescription && (
                <p className="feature-description">{featureDescription}</p>
              )}

              <div className="unlock-offer">
                <div className="offer-badge">
                  <span className="badge-icon">🎬</span>
                  <span className="badge-text">Watch a short video</span>
                </div>
                <p className="unlock-duration">
                  Unlock for <strong>{getFeatureDurationText()}</strong>
                </p>
              </div>

              {error && (
                <div className="error-message">
                  ⚠️ {error}
                </div>
              )}

              <button 
                className="action-button watch-ad-button"
                onClick={handleWatchAd}
                disabled={isWatching}
              >
                {isWatching ? (
                  <>
                    <span className="spinner"></span>
                    Loading Ad...
                  </>
                ) : (
                  <>
                    <span className="button-icon">▶️</span>
                    Watch Ad to Unlock
                  </>
                )}
              </button>

              <button className="action-button secondary" onClick={onClose}>
                Maybe Later
              </button>

              <p className="premium-hint">
                Or upgrade to Premium for unlimited access
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdUnlockModal;
