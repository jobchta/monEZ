import { useState, useEffect, useCallback } from 'react';
import adUnlockService from '../services/adUnlockService';

/**
 * Custom React Hook for Ad-based Feature Unlocks
 * Provides easy integration of ad unlock functionality into components
 * 
 * @param {string} featureId - Unique identifier for the feature
 * @returns {Object} Hook state and methods
 */
const useAdUnlock = (featureId) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showModal, setShowModal] = useState(false);

  // Check unlock status on mount and when featureId changes
  useEffect(() => {
    checkUnlockStatus();
  }, [featureId]);

  // Update timer every second if unlocked
  useEffect(() => {
    if (isUnlocked && timeRemaining > 0) {
      const timer = setInterval(() => {
        const remaining = adUnlockService.getUnlockTimeRemaining(featureId);
        if (remaining <= 0) {
          setIsUnlocked(false);
          setTimeRemaining(0);
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isUnlocked, timeRemaining, featureId]);

  /**
   * Check if feature is currently unlocked
   */
  const checkUnlockStatus = useCallback(() => {
    const unlocked = adUnlockService.isFeatureUnlocked(featureId);
    setIsUnlocked(unlocked);
    
    if (unlocked) {
      const remaining = adUnlockService.getUnlockTimeRemaining(featureId);
      setTimeRemaining(remaining);
    }
  }, [featureId]);

  /**
   * Request unlock by watching ad
   */
  const requestUnlock = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await adUnlockService.watchAdToUnlock(featureId);
      
      if (result.success) {
        setIsUnlocked(true);
        const remaining = adUnlockService.getUnlockTimeRemaining(featureId);
        setTimeRemaining(remaining);
        return { success: true, result };
      } else {
        setError(result.message || 'Failed to unlock feature');
        return { success: false, error: result.message };
      }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [featureId, isLoading]);

  /**
   * Show the unlock modal
   */
  const openUnlockModal = useCallback(() => {
    setShowModal(true);
  }, []);

  /**
   * Hide the unlock modal
   */
  const closeUnlockModal = useCallback(() => {
    setShowModal(false);
  }, []);

  /**
   * Require unlock - show modal if not unlocked, execute callback if unlocked
   * @param {Function} callback - Function to execute if feature is unlocked
   */
  const requireUnlock = useCallback((callback) => {
    if (isUnlocked) {
      if (callback && typeof callback === 'function') {
        callback();
      }
      return true;
    } else {
      openUnlockModal();
      return false;
    }
  }, [isUnlocked, openUnlockModal]);

  /**
   * Format time remaining for display
   */
  const getFormattedTimeRemaining = useCallback(() => {
    if (timeRemaining <= 0) return '';

    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [timeRemaining]);

  /**
   * Get feature unlock duration
   */
  const getUnlockDuration = useCallback(() => {
    return adUnlockService.getFeatureUnlockDuration(featureId);
  }, [featureId]);

  return {
    // State
    isUnlocked,
    isLoading,
    error,
    timeRemaining,
    showModal,
    formattedTimeRemaining: getFormattedTimeRemaining(),
    unlockDuration: getUnlockDuration(),

    // Methods
    requestUnlock,
    requireUnlock,
    openUnlockModal,
    closeUnlockModal,
    checkUnlockStatus,
  };
};

export default useAdUnlock;
