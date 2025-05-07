import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Create the context
const AuthContext = createContext(null);

// Define the provider component
export const AuthProvider = ({ children }) => {
  const [username, setUsername] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Update this to the Render backend URL
  const API_BASE_URL = 'https://note-buddy-backend.onrender.com';

  // Check if the user is already logged in (on component mount)
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    const storedPassword = localStorage.getItem('password'); // This is for development only
    
    if (storedUsername && storedPassword) {
      setUsername(storedUsername);
      setIsAuthenticated(true);
    }
    
    setIsLoading(false);
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
        // Store credentials in localStorage
        localStorage.setItem('username', username);
        localStorage.setItem('password', password); // This is for development only
        
        // Update state
        setUsername(username);
        setIsAuthenticated(true);
        
        // Redirect to home page
        navigate('/');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
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
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  };

  // Logout function
  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('username');
    localStorage.removeItem('password');
    
    // Update state
    setUsername(null);
    setIsAuthenticated(false);
    
    // Redirect to login page
    navigate('/login');
  };

  // Authenticated fetch function (adds the authorization header)
  const authFetch = async (url, options = {}) => {
    const storedUsername = localStorage.getItem('username');
    const storedPassword = localStorage.getItem('password');
    
    if (!storedUsername || !storedPassword) {
      throw new Error('Not authenticated');
    }
    
    // Create Basic Auth header
    const authHeader = `Basic ${storedUsername}:${storedPassword}`;
    
    // Add headers to the options
    const authOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': authHeader,
      },
    };
    
    // Make the request to the full URL (with API base)
    return fetch(`${API_BASE_URL}${url}`, authOptions);
  };

  // Provide the context values
  const contextValue = {
    username,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    authFetch,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};