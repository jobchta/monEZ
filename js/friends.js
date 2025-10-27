import { auth, db, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp } from './firebase.js';
import { AppState, showNotification } from './utils.js';

let friendsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getFriends(userId, forceRefresh = false) {
    if (!forceRefresh && friendsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
        return friendsCache;
    }

    const q = query(collection(db, 'friends'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    friendsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    cacheTimestamp = Date.now();
    
    AppState.friends = friendsCache;
    console.log('Friends loaded:', AppState.friends.length);

    if (window.populatePeopleSelector) {
        window.populatePeopleSelector();
    }

    return friendsCache;
}

// This is now an alias for getFriends to fit into the existing app structure
export function startFriendsListener(userId) {
    getFriends(userId);
}

// To be called when a friend is added/updated/deleted to invalidate cache
export function invalidateFriendsCache() {
    friendsCache = null;
    cacheTimestamp = null;
}

// Add a new friend
export async function addFriend(name, phone = null, email = null) {
  if (!auth.currentUser) {
    showNotification('Please sign in first', 'error');
    return null;
  }
  
  if (!name || name.trim().length === 0) {
    showNotification('Friend name is required', 'error');
    return null;
  }
  
  const colors = ['#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6'];
  const avatar = name.charAt(0).toUpperCase();
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  try {
    const friendData = {
      userId: auth.currentUser.uid,
      name: name.trim(),
      avatar: avatar,
      color: color,
      phone: phone,
      email: email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'friends'), friendData);
    
    showNotification(`✅ ${name} added to your friends!`, 'success');
    
    return {
      id: docRef.id,
      ...friendData
    };
  } catch (error) {
    console.error('Error adding friend:', error);
    showNotification('Failed to add friend: ' + error.message, 'error');
    return null;
  }
}

// Update friend
export async function updateFriend(friendId, updates) {
  if (!auth.currentUser) {
    showNotification('Please sign in first', 'error');
    return false;
  }
  
  try {
    await updateDoc(doc(db, 'friends', friendId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    showNotification('✅ Friend updated', 'success');
    return true;
  } catch (error) {
    console.error('Error updating friend:', error);
    showNotification('Failed to update friend: ' + error.message, 'error');
    return false;
  }
}

// Delete friend
export async function deleteFriend(friendId) {
  if (!auth.currentUser) {
    showNotification('Please sign in first', 'error');
    return false;
  }
  
  // Check if friend has any expenses
  const hasExpenses = AppState.expenses.some(expense => 
    expense.splitWith && expense.splitWith.includes(friendId)
  );
  
  if (hasExpenses) {
    const confirmed = confirm(
      'This friend has expenses with you. Deleting will not remove the expenses. Continue?'
    );
    if (!confirmed) return false;
  }
  
  try {
    await deleteDoc(doc(db, 'friends', friendId));
    showNotification('✅ Friend removed', 'success');
    return true;
  } catch (error) {
    console.error('Error deleting friend:', error);
    showNotification('Failed to delete friend: ' + error.message, 'error');
    return false;
  }
}

// Search friends by name
export function searchFriends(searchTerm) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return AppState.friends;
  }
  
  const term = searchTerm.toLowerCase();
  return AppState.friends.filter(friend =>
    friend.name.toLowerCase().includes(term)
  );
}

// Get friend by ID
export function getFriendById(friendId) {
  return AppState.friends.find(f => f.id === friendId);
}

// Get friend by name
export function getFriendByName(name) {
  return AppState.friends.find(f => 
    f.name.toLowerCase() === name.toLowerCase()
  );
}
