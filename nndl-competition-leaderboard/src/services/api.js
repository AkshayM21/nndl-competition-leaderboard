import axios from 'axios';

import { getCurrentToken } from './firebase';


// Create axios instance with base URL and default headers
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
    async (config) => {
      try {
        // Get token dynamically using the helper function
        const token = await getCurrentToken();
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          // Debug output - remove in production
          console.log('Using token for request:', config.url);
        } else {
          console.warn('No auth token available for request:', config.url);
        }
      } catch (error) {
        console.error('Error setting auth token:', error);
      }
      
      return config;
    },
    (error) => Promise.reject(error)
);


// Add response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // If error is 401 Unauthorized and we haven't retried yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // Force refresh token
          const user = await import('./firebase').then(module => module.auth.currentUser);
          if (user) {
            const newToken = await user.getIdToken(true);
            localStorage.setItem('authToken', newToken);
            
            // Update the request header with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            
            // Retry the request
            return axios(originalRequest);
          }
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
        }
      }
      
      return Promise.reject(error);
    }
);

// API methods
export const evaluateSubmission = (submissionData) => {
    //return api.post('https://evaluatesubmission-sitbsjpjkq-uc.a.run.app', submissionData);
  console.log(submissionData)
  return api.post('https://us-central1-nndl-course-leaderboard.cloudfunctions.net/evaluatesubmission', submissionData);

};

export const getLeaderboard = () => {
    //return api.get('https://leaderboard-sitbsjpjkq-uc.a.run.app');
  return api.get('https://us-central1-nndl-course-leaderboard.cloudfunctions.net/leaderboard');
};

export default api;