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
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
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
        return true;
      } else {
        setError(data.error || 'Login failed');
        return false;
      }
    } catch (err) {
      setError('Network error. Please try again.');
      return false;
    }
  };
  
  // Register function
  const register = async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setError('');
        return true;
      } else {
        setError(data.error || 'Registration failed');
        return false;
      }
    } catch (err) {
      setError('Network error. Please try again.');
      return false;
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

  // Custom fetch with authentication headers
  const authFetch = async (url, options = {}) => {
    if (!credentials) {
      throw new Error('Not authenticated');
    }
    
    const headers = {
      ...options.headers,
      'Authorization': credentials,
    };
    
    return fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });
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
      authFetch
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => useContext(AuthContext);