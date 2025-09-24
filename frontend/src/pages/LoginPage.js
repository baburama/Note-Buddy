import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../App.css';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, error } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const success = await login(username, password);
    
    setLoading(false);
    if (success) {
      navigate('/');
    }
  };
  
  return (
    <div className="App">
      <div className="login-container">
        <div className="login-box">
          <h1>NoteBuddy.ai</h1>
          <h2>Login</h2>
          
          {error && <p className="error-message">{error}</p>}
          
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
            </div>
            
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <p className="register-link">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;