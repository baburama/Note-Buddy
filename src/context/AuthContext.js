import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

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

    // Set up periodic health checks every 5 minutes
    const healthCheckInterval = setInterval(() => {
      checkBackendHealth();
    }, 5 * 60 * 1000);

    return () => clearInterval(healthCheckInterval);
  }, []);

  // Private helper for making fetch requests with health check, timeouts, and retries
  const _healthCheckedFetch = async (
    url, 
    options = {}, 
    healthRetries = 3, 
    fetchRetries = 1,
    requiresAuth = true
  ) => {
    // Step 1: Check backend health first with retries
    if (backendStatus !== 'ready') {
      const isBackendReady = await waitForBackend(healthRetries);
      if (!isBackendReady) {
        console.error('Backend is not ready after multiple attempts');
        throw new Error('Backend is still starting up. Please try again in a moment.');
      }
    }
    
    // Step 2: Prepare request with authentication if needed
    let fetchOptions = { ...options };

    if (requiresAuth) {
      if (!credentials) {
        console.error('No credentials available for authenticated request');
        setIsAuthenticated(false);
        navigate('/login');
        throw new Error('Session expired. Please log in again.');
      }
      
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Authorization': credentials,
      };
    }
    
    // Step 3: Make the request with retries
    let lastError;
    let retries = 0;

    while (retries <= fetchRetries) {
      try {
        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        fetchOptions.signal = controller.signal;
        
        const response = await fetch(`${API_BASE_URL}${url}`, fetchOptions);
        
        clearTimeout(timeoutId);
        
        // Handle authentication errors (retry after a small delay)
        if ((response.status === 401 || response.status === 403) && retries < fetchRetries) {
          console.warn(`Authentication error (${response.status}), retrying (${retries + 1}/${fetchRetries})...`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        return response;
      } catch (error) {
        lastError = error;
        
        // Handle timeouts (retry after a small delay)
        if (error.name === 'AbortError' && retries < fetchRetries) {
          console.warn(`Request timed out, retrying (${retries + 1}/${fetchRetries})...`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        // If error is not a timeout or we're out of retries, rethrow
        break;
      }
    }
    
    // If we get here, all retries failed
    if (lastError?.name === 'AbortError') {
      throw new Error('Request timed out. The server might be slow to respond.');
    }
    
    throw lastError || new Error('Request failed after retries');
  };

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

  // Login function with health check and retries
  const login = async (username, password) => {
    try {
      const response = await _healthCheckedFetch(
        '/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        },
        3,  // Health check retries
        1,  // Fetch retries
        false // No auth required for login
      );
      
      const data = await response.json();
      
      if (response.ok) {
        // Store credentials for Basic Auth
        const credentials = `Basic ${username}:${password}`;
        localStorage.setItem('username', username);
        localStorage.setItem('credentials', credentials);
        localStorage.setItem('lastActivity', Date.now().toString());
        
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
      console.error('Login error:', err);
      
      // Check if it's a backend availability issue
      if (err.message.includes('starting up')) {
        return { success: false, isBackendStarting: true, error: err.message };
      }
      
      setError(err.message || 'Network error. Please try again.');
      return { success: false, error: err.message || 'Network error. Please try again.' };
    }
  };
  
  // Register function with health check and retries
  const register = async (username, password) => {
    try {
      const response = await _healthCheckedFetch(
        '/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        },
        3, // Health check retries
        1, // Fetch retries
        false // No auth required for register
      );
      
      const data = await response.json();
      
      if (response.ok) {
        setError('');
        return { success: true };
      } else {
        setError(data.error || 'Registration failed');
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (err) {
      console.error('Registration error:', err);
      
      // Check if it's a backend availability issue
      if (err.message.includes('starting up')) {
        return { success: false, isBackendStarting: true, error: err.message };
      }
      
      setError(err.message || 'Network error. Please try again.');
      return { success: false, error: err.message || 'Network error. Please try again.' };
    }
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('credentials');
    localStorage.removeItem('lastActivity');
    setUsername('');
    setCredentials('');
    setIsAuthenticated(false);
  };

  // Custom fetch with health check, authentication and retries
  const authFetch = async (url, options = {}) => {
    try {
      // Update last activity time
      localStorage.setItem('lastActivity', Date.now().toString());
      
      return await _healthCheckedFetch(
        url,
        options,
        3, // Health check retries
        2  // Fetch retries
      );
    } catch (error) {
      // Handle special case for authentication errors to trigger logout
      if (error.message.includes('Session expired')) {
        logout();
        navigate('/login');
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