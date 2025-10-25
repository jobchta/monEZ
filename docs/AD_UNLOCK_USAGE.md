# Ad-Supported Feature Unlocks - Usage Guide

This document explains how to integrate the ad-based premium feature unlock system into your components.

## Overview

The ad unlock system allows users to unlock premium features by watching rewarded video ads. It includes:
- **Service Layer**: `adUnlockService.js` - Core logic for ad management
- **React Hook**: `useAdUnlock.js` - Easy integration into React components
- **UI Component**: `AdUnlockModal.jsx` - Beautiful lock screen with "Watch Ad to Unlock" UI

## Quick Start

### 1. Initialize the Ad Service

First, initialize the ad provider in your app's entry point:

```javascript
import adUnlockService from './services/adUnlockService';

// Initialize on app startup
await adUnlockService.initializeAdProvider({
  // Add your AdMob/Meta config here when ready
  // For now, uses mock implementation
});
```

### 2. Use the React Hook

The easiest way to add ad unlock functionality to any component:

```jsx
import React from 'react';
import useAdUnlock from '../hooks/useAdUnlock';
import AdUnlockModal from '../components/AdUnlockModal';

function AIFeatureComponent() {
  const {
    isUnlocked,
    showModal,
    openUnlockModal,
    closeUnlockModal,
    formattedTimeRemaining,
  } = useAdUnlock('ai_scan');

  const handleAIScanClick = () => {
    if (isUnlocked) {
      // Feature is unlocked, proceed
      performAIScan();
    } else {
      // Feature locked, show unlock modal
      openUnlockModal();
    }
  };

  return (
    <div>
      <button onClick={handleAIScanClick}>
        {isUnlocked ? 'Scan with AI' : '🔒 Unlock AI Scan'}
      </button>
      
      {isUnlocked && (
        <p>Available for: {formattedTimeRemaining}</p>
      )}

      {showModal && (
        <AdUnlockModal
          featureId="ai_scan"
          featureName="AI-Powered Scan"
          featureIcon="🤖"
          featureDescription="Get intelligent insights with AI analysis"
          onUnlock={() => {
            console.log('Feature unlocked!');
            performAIScan();
          }}
          onClose={closeUnlockModal}
        />
      )}
    </div>
  );
}
```

### 3. Using the RequireUnlock Pattern

For simpler integration, use the `requireUnlock` method:

```jsx
function AnalyticsFeature() {
  const { requireUnlock, showModal, closeUnlockModal } = useAdUnlock('analytics');

  const viewAnalytics = () => {
    requireUnlock(() => {
      // This code only runs if feature is unlocked
      navigateToAnalytics();
    });
    // If locked, modal automatically opens
  };

  return (
    <div>
      <button onClick={viewAnalytics}>View Analytics</button>
      
      {showModal && (
        <AdUnlockModal
          featureId="analytics"
          featureName="Advanced Analytics"
          featureIcon="📊"
          onClose={closeUnlockModal}
        />
      )}
    </div>
  );
}
```

## Available Features

| Feature ID | Feature Name | Unlock Duration |
|-----------|--------------|----------------|
| `ai_scan` | AI-Powered Scan | 24 hours |
| `extra_group` | Extra Group Slot | 7 days |
| `analytics` | Advanced Analytics | 3 days |
| `export_data` | Data Export | 24 hours |
| `custom_themes` | Custom Themes | 7 days |

## Hook API Reference

### `useAdUnlock(featureId)`

Returns an object with:

#### State
- **`isUnlocked`** (boolean): Whether the feature is currently unlocked
- **`isLoading`** (boolean): Whether an ad is currently being loaded/watched
- **`error`** (string|null): Error message if unlock failed
- **`timeRemaining`** (number): Milliseconds until unlock expires
- **`showModal`** (boolean): Whether the unlock modal should be shown
- **`formattedTimeRemaining`** (string): Human-readable time remaining (e.g., "2h 30m")
- **`unlockDuration`** (number): Total unlock duration for this feature

#### Methods
- **`requestUnlock()`**: Manually trigger ad watching flow
  ```javascript
  const { success, result, error } = await requestUnlock();
  ```

- **`requireUnlock(callback)`**: Execute callback only if unlocked, else show modal
  ```javascript
  requireUnlock(() => {
    // Protected feature code
  });
  ```

- **`openUnlockModal()`**: Show the unlock modal
- **`closeUnlockModal()`**: Hide the unlock modal
- **`checkUnlockStatus()`**: Manually re-check unlock status

## Service API Reference

### Direct Service Usage (Advanced)

For non-React code or advanced use cases:

```javascript
import adUnlockService from './services/adUnlockService';

// Check if feature is unlocked
const isUnlocked = adUnlockService.isFeatureUnlocked('ai_scan');

// Watch ad to unlock
const result = await adUnlockService.watchAdToUnlock('ai_scan');
if (result.success) {
  console.log('Unlocked until:', result.expiresAt);
}

// Get time remaining
const ms = adUnlockService.getUnlockTimeRemaining('ai_scan');

// Get unlock duration for a feature
const duration = adUnlockService.getFeatureUnlockDuration('ai_scan');
```

## Component Props

### `<AdUnlockModal>` Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `featureId` | string | ✅ | Unique feature identifier |
| `featureName` | string | ✅ | Display name of the feature |
| `featureIcon` | string | | Emoji or icon to display |
| `featureDescription` | string | | Short description of the feature |
| `onUnlock` | function | | Callback when feature is unlocked |
| `onClose` | function | ✅ | Callback to close the modal |

## Production SDK Integration

The current implementation uses a mock ad provider. To integrate with production ad networks:

### AdMob Integration

```javascript
// In adUnlockService.js, replace initializeAdProvider:

async initializeAdProvider(config = {}) {
  this.adProvider = {
    isReady: false,
    loadAd: async () => {
      return new Promise((resolve, reject) => {
        window.admob.rewardVideo.load({
          adUnitId: config.adUnitId,
        }, () => {
          this.adProvider.isReady = true;
          resolve({ loaded: true });
        }, reject);
      });
    },
    showAd: async () => {
      return new Promise((resolve, reject) => {
        window.admob.rewardVideo.show(
          () => resolve({ watched: true, reward: { type: 'feature_unlock', amount: 1 } }),
          reject
        );
      });
    }
  };
  
  // Preload first ad
  await this.adProvider.loadAd();
}
```

### Meta Audience Network Integration

```javascript
// Alternative implementation for Meta Audience Network

async initializeAdProvider(config = {}) {
  this.adProvider = {
    isReady: false,
    loadAd: async () => {
      return window.FBAudienceNetwork.loadRewarded(config.placementId)
        .then(() => {
          this.adProvider.isReady = true;
          return { loaded: true };
        });
    },
    showAd: async () => {
      return window.FBAudienceNetwork.showRewarded()
        .then(() => ({ watched: true, reward: { type: 'feature_unlock', amount: 1 } }));
    }
  };
  
  await this.adProvider.loadAd();
}
```

## Analytics Tracking

The service automatically tracks unlock events. To integrate with your analytics platform:

```javascript
// In adUnlockService.js, update sendAnalytics method:

async sendAnalytics(event) {
  try {
    // Google Analytics
    if (window.gtag) {
      gtag('event', 'ad_unlock', {
        feature_id: event.featureId,
        event_category: 'monetization',
      });
    }
    
    // Custom backend
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('[AdUnlock] Analytics error:', error);
  }
}
```

## Customization

### Adding New Features

To add a new unlockable feature:

1. Add the feature duration in `adUnlockService.js`:
```javascript
getFeatureUnlockDuration(featureId) {
  const durations = {
    // ... existing features
    'premium_export': 48 * 60 * 60 * 1000, // 48 hours
  };
  return durations[featureId] || 24 * 60 * 60 * 1000;
}
```

2. Use the hook in your component:
```jsx
const { requireUnlock, showModal, closeUnlockModal } = useAdUnlock('premium_export');
```

### Styling Customization

Modify `AdUnlockModal.css` to match your app's theme:

```css
/* Change the gradient background */
.ad-unlock-modal {
  background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
}

/* Customize button colors */
.watch-ad-button {
  background: linear-gradient(135deg, #your-brand-color 0%, #your-accent-color 100%);
}
```

## Best Practices

1. **Initialize Early**: Initialize the ad service when your app starts to preload ads
2. **Handle Errors**: Always handle the error state from the hook
3. **Clear Messaging**: Use descriptive feature names and descriptions
4. **Test Thoroughly**: Test the full flow including modal open/close, ad watching, and unlock state
5. **Monitor Analytics**: Track unlock rates to optimize ad placement
6. **Fallback to Premium**: Always offer a premium subscription as an alternative

## Troubleshooting

### Feature not unlocking
- Check browser console for errors
- Verify feature ID matches exactly
- Ensure ad service is initialized

### Modal not appearing
- Check that `showModal` state is true
- Verify modal is included in component JSX
- Check CSS z-index conflicts

### Unlock expires immediately
- Check system time is correct
- Verify localStorage is enabled
- Check getFeatureUnlockDuration returns correct duration

## Support

For issues or questions:
- Create an issue in the repository
- Check existing documentation
- Review the example implementations above

---

**Version**: 1.0.0  
**Last Updated**: October 2025
