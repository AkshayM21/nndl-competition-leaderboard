// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut
} from "firebase/auth";
import { 
  getDatabase, 
  ref, 
  set, 
  push,
  get,
  query,
  orderByChild
} from "firebase/database";
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// Custom function to handle Google sign-in with domain restriction
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const email = user.email;
    
    // Check if user has columbia.edu or barnard.edu email
    if (!email.endsWith('@columbia.edu') && !email.endsWith('@barnard.edu')) {
      await signOut(auth);
      throw new Error('Only Columbia University and Barnard College emails are allowed');
    }

    // Get and store the user's ID token
    const token = await user.getIdToken();
    localStorage.setItem('authToken', token);
    console.log('User authenticated and token stored');
    
    return user;
  } catch (error) {
    console.error("Error signing in with Google: ", error);
    throw error;
  }
};

// Function to sign out
export const logOut = () => {
    // Clear token from localStorage
    localStorage.removeItem('authToken');
    
    // Clear token refresh interval if exists
    const intervalId = localStorage.getItem('tokenRefreshInterval');
    if (intervalId) {
      clearInterval(Number(intervalId));
      localStorage.removeItem('tokenRefreshInterval');
    }
    
    return signOut(auth);
};


// Function to upload CSV file to Firebase Storage
export const uploadCSV = async (file, email) => {
  const fileRef = storageRef(storage, `submissions/${email}/${Date.now()}_${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
};

// Function to save submission to the database
export const saveSubmission = async (submissionData) => {
  const submissionsRef = ref(database, 'submissions');
  const newSubmissionRef = push(submissionsRef);
  await set(newSubmissionRef, {
    ...submissionData,
    submissionTime: new Date().toISOString()
  });
  return newSubmissionRef.key;
};

// Function to get all submissions for the leaderboard
export const getLeaderboardData = async () => {
  const submissionsRef = ref(database, 'submissions');
  const leaderboardQuery = query(submissionsRef, orderByChild('metrics/superAccuracy'));
  
  const snapshot = await get(leaderboardQuery);
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.entries(data).map(([key, value]) => ({
      id: key,
      ...value
    })).sort((a, b) => b.metrics.superAccuracy - a.metrics.superAccuracy);
  }
  
  return [];
};

// Helper function to get the current auth token
export const getCurrentToken = async () => {
    // First try to get from localStorage
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) return storedToken;
    
    // If not available or expired, try to get a fresh one
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken(true);
        localStorage.setItem('authToken', token);
        return token;
      } catch (error) {
        console.error('Error getting fresh token:', error);
        return null;
      }
    }
    
    return null;
};

// Export Firebase instances for direct use if needed
export { auth, database, storage, app };