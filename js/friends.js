import { updateState } from './state.js';
import { db, getDocs, query, collection, where } from './firebase.js';

let friendsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 1000 * 60 * 5; // 5min

export async function getFriends(userId, forceRefresh = false) {
    if (!userId) {
        console.warn('getFriends called without userId');
        return [];
    }
    if (!forceRefresh && friendsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
        return friendsCache;
    }
    try {
        const q = query(collection(db, 'friends'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        friendsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cacheTimestamp = Date.now();
        updateState({ friends: friendsCache });
        console.log('✅ Friends loaded:', friendsCache.length);
        if (window.populatePeopleSelector) {
            window.populatePeopleSelector();
        }
        return friendsCache;
    } catch (error) {
        console.error('Error fetching friends:', error);
        showNotification('Failed to load friends', 'error');
        return [];
    }
}

export function clearFriendsCache() {
    friendsCache = null;
    cacheTimestamp = null;
    updateState({ friends: [] });
}

if (typeof window !== 'undefined') {
    window.invalidateFriendsCache = clearFriendsCache;
}
