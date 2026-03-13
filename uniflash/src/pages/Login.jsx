import React, { useState } from 'react';
import '../styles/Login.css';

const Login = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check password
    if (password === 'unicorn_mara_poptart_1234!!') {
      // Store authentication in sessionStorage
      sessionStorage.setItem('isAuthenticated', 'true');

      // If remember me is checked, also store with 30-day expiration
      if (rememberMe) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);
        localStorage.setItem('rememberAuth', JSON.stringify({
          authenticated: true,
          expires: expirationDate.toISOString()
        }));
      } else {
        // Clear any existing remember me data
        localStorage.removeItem('rememberAuth');
      }

      onLogin(true);
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🦄 Uniflash</h1>
          <p>Please enter the password to access the app</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter password"
              autoFocus
              className="password-input"
            />
          </div>

          <div className="remember-me-group">
            <label className="remember-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember this device for 30 days
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary btn-large">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
