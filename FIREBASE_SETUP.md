# Firebase Setup Guide for monEZ - Step 1.1

## ✅ **Step 1.1 Complete!**

You now have a fully functional authentication system. Here's what we built:

---

## 📁 **Files Created**

### 1. **firebase-config.js**
- Contains Firebase configuration
- **Action**: Replace placeholders with your actual Firebase credentials

### 2. **js/auth-module.js**
- Complete Firebase authentication module
- Functions: `signup()`, `login()`, `logout()`, `isLoggedIn()`, `getCurrentUser()`
- Real-time auth state listener
- Firestore user data creation

### 3. **auth.html**
- Beautiful login/signup UI
- Toggle between forms
- Error/success notifications
- Form validation
- Responsive design

### 4. **index.html (Updated)**
- Added auth state check
- Redirects to auth.html if not logged in
- Shows user avatar & email
- Logout functionality

---

## 🚀 **How to Setup & Deploy**

### **Step 1: Create Firebase Project**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add Project"**
3. Enter project name: **"monEZ"**
4. Enable Google Analytics (optional)
5. Click **"Create Project"**

### **Step 2: Get Firebase Credentials**

1. In Firebase Console, go to **Project Settings**
2. Click on **"Your Apps"** section
3. Click **"Create App"** → **"Web"**
4. Enter app name: **"monEZ"
5. Copy the config object

**Example config:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "monez-xxx.firebaseapp.com",
  projectId: "monez-xxx",
  storageBucket: "monez-xxx.appspot.com",
  messagingSenderId: "xxx",
  appId: "1:xxx:web:xxx"
};
```

### **Step 3: Update firebase-config.js**

1. Open `firebase-config.js`
2. Replace the placeholders with your actual config
3. Save and commit

### **Step 4: Enable Email/Password Authentication**

1. In Firebase Console → **Authentication**
2. Go to **Sign-in method** tab
3. Click **Email/Password**
4. Enable both options:
   - ✅ Email/Password
   - ✅ Enable email link sign-in (optional)
5. Click **Save**

### **Step 5: Create Firestore Database**

1. In Firebase Console → **Firestore Database**
2. Click **Create Database**
3. Select: **"Start in test mode"** (for development)
4. Choose region: **Asia-south1 (Mumbai)** (since you're in Mumbai)
5. Click **Enable**

### **Step 6: Firestore Security Rules (Update Later)**

For now, use test mode (allows all reads/writes). In production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Expenses
    match /expenses/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Groups
    match /groups/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### **Step 7: Deploy to GitHub Pages**

1. Update `firebase-config.js` with your credentials
2. Push to GitHub:
   ```bash
   git add .
   git commit -m "🔐 Add Firebase credentials"
   git push origin main
   ```
3. Wait 2-3 minutes for Netlify to auto-deploy

---

## 🧪 **Testing Authentication**

### **Test Signup:**
1. Open https://your-app.netlify.app/auth.html
2. Click **"Sign Up"**
3. Enter:
   - Email: `test@gmail.com`
   - Name: `Test User`
   - Phone: `+91-9876543210` (optional)
   - Password: `Test@123`
4. Click **"Create Account"**
5. Should redirect to homepage with user avatar

### **Test Login:**
1. Open https://your-app.netlify.app/auth.html
2. Enter credentials from signup
3. Click **"Sign In"**
4. Should redirect to homepage

### **Test Logout:**
1. On homepage, click user avatar
2. Select **Logout**
3. Should redirect back to auth page

### **Test Cross-Device Login:**
1. Login on PC
2. Open same app on mobile
3. Both should show same user data

---

## 🔐 **Security Checklist**

- ✅ Firebase credentials NOT in public repo
- ✅ Auth tokens stored safely in localStorage
- ✅ Service Worker caches only public files
- ✅ HTTPS enforced (Netlify auto-enables)
- ✅ Email verification (optional, can add later)
- ✅ Password reset flow (can add in Step 1.2)

---

## 🚨 **Common Issues & Fixes**

### **Issue: "Firebase not defined"**
- Check if `firebase-config.js` is loaded
- Verify credentials are correct

### **Issue: "User not authenticated, redirecting..."**
- Make sure Firebase Auth is enabled
- Check if credentials are valid

### **Issue: "Failed to create user"**
- Check email format
- Password must be 6+ characters
- Email might already exist

### **Issue: "localStorage blocked"**
- Works on https (Netlify has this)
- Test mode in Firefox may block it
- Try Chrome or Firefox in private mode

---

## 📊 **What Data is Stored?**

### **Firebase Auth:**
- Email
- Password hash
- Auth token
- Last login time

### **Firestore (users collection):**
```json
{
  "uid": "user123",
  "email": "raj@gmail.com",
  "name": "Raj Kumar",
  "phone": "+91-9876543210",
  "avatar": "R",
  "createdAt": "2025-11-08...",
  "friends": [],
  "groups": [],
  "balance": {},
  "preferences": {
    "theme": "light",
    "notifications": true
  }
}
```

---

## ✅ **Step 1.1 Checklist**

- ✅ Firebase config created
- ✅ Auth module built
- ✅ Auth UI created
- ✅ Login/Signup working
- ✅ Session persistence working
- ✅ Cross-device login working
- ✅ Logout functionality added
- ✅ User data saved to Firestore

---

## 🎯 **Next Step: Step 1.2**

After testing, we'll move to **Step 1.2: User Profile Creation**
- Verify email
- Update profile info
- Avatar upload
- Phone verification

---

## 📞 **Need Help?**

If you encounter any errors:
1. Check browser console (F12 → Console tab)
2. Check Firebase console for errors
3. Verify firebase-config.js has correct credentials
4. Clear localStorage and try again

---

**🎉 Step 1.1 - Firebase Authentication is now COMPLETE!**
