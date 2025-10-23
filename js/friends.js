// monEZ - Friends Management System

import { auth, db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp } from './firebase.js';
import { AppState, showNotification } from './utils.js';

// Real-time listener for user's friends
let friendsUnsubscribe = null;

// Start listening to user's friends
export function startFriendsListener(userId) {
  if (friendsUnsubscribe) {
    friendsUnsubscribe(); // Clean up previous listener
  }
  
  const q = query(
    collection(db, 'friends'),
    where('userId', '==', userId)
  );
  
  friendsUnsubscribe = onSnapshot(q, (snapshot) => {
    AppState.friends = [];
    
    snapshot.forEach((doc) => {
      AppState.friends.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('Friends loaded:', AppState.friends.length);
    
    // Re-render UI if needed
    if (window.populatePeopleSelector) {
      window.populatePeopleSelector();
    }
  });
}

// Stop listening
export function stopFriendsListener() {
  if (friendsUnsubscribe) {
    friendsUnsubscribe();
    friendsUnsubscribe = null;
  }
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
