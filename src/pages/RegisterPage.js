import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../App.css';

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const { register, error } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate password
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    
    setPasswordError('');
    setLoading(true);
    
    const success = await register(username, password);
    
    setLoading(false);
    if (success) {
      navigate('/login');
    }
  };
  
  return (
    <div className="App">
      <div className="login-container">
        <div className="login-box">
          <h1>NoteBuddy.ai</h1>
          <h2>Create Account</h2>
          
          {(error || passwordError) && (
            <p className="error-message">{passwordError || error}</p>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <small className="form-hint">Must be at least 8 characters</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
          
          <p className="register-link">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;