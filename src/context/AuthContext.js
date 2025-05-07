import React, { createContext, useState, useContext, useEffect } from 'react';

// Create context
export const AuthContext = createContext(null);

// Base URL for API - can be changed for different environments
const API_BASE_URL = 'https://note-buddy-backend.onrender.com';

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [credentials, setCredentials] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState('unknown'); // 'unknown', 'starting', 'ready'

  // Check if user is already logged in
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    const storedCredentials = localStorage.getItem('credentials');
    
    if (storedUsername && storedCredentials) {
      setUsername(storedUsername);
      setCredentials(storedCredentials);
      setIsAuthenticated(true);
    }
    
    setLoading(false);
    
    // Initial health check on component mount
    checkBackendHealth();
  }, []);

  // Function to check backend health
  const checkBackendHealth = async () => {
    try {
      setBackendStatus('starting');
      console.log('Checking backend health...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_BASE_URL}/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'healthy') {
          console.log('Backend is healthy and ready');
          setBackendStatus('ready');
          return true;
        } else {
          console.log('Backend is starting up (degraded state)');
          setBackendStatus('starting');
          return false;
        }
      } else {
        console.log('Backend health check failed');
        setBackendStatus('starting');
        return false;
      }
    } catch (error) {
      console.log('Backend health check error:', error.name === 'AbortError' ? 'Timeout' : error);
      setBackendStatus('starting');
      return false;
    }
  };

  // Wait for backend with retry
  const waitForBackend = async (maxAttempts = 3, interval = 5000) => {
    // First check if backend is already ready
    if (backendStatus === 'ready') {
      return true;
    }
    
    // Try initial health check
    const initialCheck = await checkBackendHealth();
    if (initialCheck) {
      return true;
    }
    
    // If backend is not ready, retry health checks
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      console.log(`Waiting for backend to start... Attempt ${attempts + 1}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, interval));
      
      const isHealthy = await checkBackendHealth();
      if (isHealthy) {
        return true;
      }
      
      attempts++;
    }
    
    return false;
  };

  // Login function with health check
  const login = async (username, password) => {
    try {
      // Check backend health first
      const isBackendReady = await waitForBackend();
      
      if (!isBackendReady) {
        setError('Backend is still starting up. Please try again in a moment.');
        return { success: false, isBackendStarting: true };
      }
      
      // Proceed with login
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (response.ok) {
        // Store credentials for Basic Auth
        const credentials = `Basic ${username}:${password}`;
        localStorage.setItem('username', username);
        localStorage.setItem('credentials', credentials);
        
        setUsername(username);
        setCredentials(credentials);
        setIsAuthenticated(true);
        setError('');
        return { success: true };
      } else {
        setError(data.error || 'Login failed');
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (err) {
      // Handle timeout specifically
      if (err.name === 'AbortError') {
        setError('Request timed out. The server might be starting up. Please try again.');
        return { success: false, isBackendStarting: true };
      }
      
      setError('Network error. Please try again.');
      return { success: false, error: 'Network error. Please try again.' };
    }
  };
  
  // Register function with health check
  const register = async (username, password) => {
    try {
      // Check backend health first
      const isBackendReady = await waitForBackend();
      
      if (!isBackendReady) {
        setError('Backend is still starting up. Please try again in a moment.');
        return { success: false, isBackendStarting: true };
      }
      
      // Proceed with registration
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (response.ok) {
        setError('');
        return { success: true };
      } else {
        setError(data.error || 'Registration failed');
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (err) {
      // Handle timeout specifically
      if (err.name === 'AbortError') {
        setError('Request timed out. The server might be starting up. Please try again.');
        return { success: false, isBackendStarting: true };
      }
      
      setError('Network error. Please try again.');
      return { success: false, error: 'Network error. Please try again.' };
    }
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('credentials');
    setUsername('');
    setCredentials('');
    setIsAuthenticated(false);
  };

  // Custom fetch with authentication headers and backend health check
  const authFetch = async (url, options = {}) => {
    if (!credentials) {
      throw new Error('Not authenticated');
    }
    
    // Check backend health first if not ready
    if (backendStatus !== 'ready') {
      await waitForBackend(1); // Just one quick retry
    }
    
    const headers = {
      ...options.headers,
      'Authorization': credentials,
    };
    
    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.log('Request timed out');
        throw new Error('Request timed out. The server might be slow to respond.');
      }
      
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      username, 
      loading,
      login, 
      register, 
      logout, 
      error,
      authFetch,
      backendStatus,
      checkBackendHealth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => useContext(AuthContext);