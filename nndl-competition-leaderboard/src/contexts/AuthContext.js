import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL;

// Create auth context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get and store the ID token when user logs in
        try {
          const token = await user.getIdToken();
          localStorage.setItem('authToken', token);
          
          // Set up token refresh (tokens expire after 1 hour)
          const tokenRefreshInterval = setInterval(async () => {
            try {
              const refreshedToken = await user.getIdToken(true); // Force refresh
              localStorage.setItem('authToken', refreshedToken);
              console.log('Token refreshed successfully');
            } catch (error) {
              console.error('Error refreshing token:', error);
            }
          }, 30 * 60 * 1000); // Refresh every 30 minutes
          
          // Save interval ID for cleanup
          localStorage.setItem('tokenRefreshInterval', tokenRefreshInterval);
        } catch (error) {
          console.error('Error getting ID token:', error);
        }
      } else {
        // Clear token and interval when user logs out
        localStorage.removeItem('authToken');
        const intervalId = localStorage.getItem('tokenRefreshInterval');
        if (intervalId) {
          clearInterval(Number(intervalId));
          localStorage.removeItem('tokenRefreshInterval');
        }
      }
      
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription and interval on unmount
    return () => {
      unsubscribe();
      const intervalId = localStorage.getItem('tokenRefreshInterval');
      if (intervalId) {
        clearInterval(Number(intervalId));
      }
    };
  }, []);

  // Provide auth context values to children
  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isColumbiaEmail: currentUser?.email?.endsWith('@columbia.edu') || false,
    isBarnardEmail: currentUser?.email?.endsWith('@barnard.edu') || false,
    isAdmin: currentUser?.email === ADMIN_EMAIL || false,
    email: currentUser?.email || '',
    // Add a method to get fresh token if needed
    getIdToken: async () => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken(true);
          localStorage.setItem('authToken', token);
          return token;
        } catch (error) {
          console.error('Error getting fresh token:', error);
          return null;
        }
      }
      return null;
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext;