import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const HomePage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    username: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (isLogin) {
        const loginData = {
          usernameOrEmail: formData.email,
          password: formData.password
        };
        console.log('Sending login request:', loginData);
        response = await authAPI.login(loginData);
      } else {
        // Split the name into first and last name
        const nameParts = formData.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const signupData = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          firstName: firstName,
          lastName: lastName
        };
        console.log('Sending signup request:', signupData);
        response = await authAPI.signup(signupData);
      }

      // Debug: log the response to see what we're getting
      console.log('API Response:', response.data);

      // Handle different response formats
      if (isLogin) {
        // Login response has success flag and user object
        if (response.data.success && response.data.user) {
          localStorage.setItem('jwt', 'temp_token_' + response.data.user.id);
          console.log('Login successful, navigating to dashboard');
          navigate('/dashboard');
        } else {
          setError(response.data.message || 'Invalid credentials');
          console.log('Login failed:', response.data);
          return;
        }
      } else {
        // Signup response is direct user object
        if (response.data.id) {
          localStorage.setItem('jwt', 'temp_token_' + response.data.id);
          console.log('Signup successful, navigating to dashboard');
          navigate('/dashboard');
        } else {
          setError('Signup failed - please try again');
          console.log('Signup failed:', response.data);
          return;
        }
      }
    } catch (err) {
      console.error('Request error:', err);
      
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Make sure the server is running on port 8080.');
      } else if (err.response) {
        // Server responded with error
        setError(err.response.data?.message || `Server error: ${err.response.status}`);
        console.log('Server error response:', err.response.data);
      } else {
        // Network or other error
        setError('Connection failed. Please check if the server is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email: '', password: '', name: '', username: '' });
    setError('');
  };

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">🎯 Kahoot Quiz</h1>
        <p className="subtitle">
          {isLogin ? 'Welcome back! Please sign in.' : 'Create your account to get started.'}
        </p>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required={!isLogin}
                  placeholder="Choose a username"
                />
              </div>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required={!isLogin}
                  placeholder="Enter your full name"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Enter your password"
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="toggle-link" onClick={toggleMode}>
          {isLogin
            ? "Don't have an account? Sign up here"
            : "Already have an account? Sign in here"
          }
        </div>
      </div>
    </div>
  );
};

export default HomePage; 