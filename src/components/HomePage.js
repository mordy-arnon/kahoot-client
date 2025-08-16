import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const HomePage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showViewerJoin, setShowViewerJoin] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    username: ''
  });
  const [viewerData, setViewerData] = useState({
    quizId: '',
    name: ''
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

  const handleViewerInputChange = (e) => {
    const { name, value } = e.target;
    setViewerData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation to provide immediate feedback
    if (!isLogin) {
      if (!formData.username.trim()) {
        setError('Username is required');
        return;
      }
      if (!formData.name.trim()) {
        setError('Full name is required');
        return;
      }
      if (!formData.email.trim()) {
        setError('Email is required');
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);

    try {
      let response;
      if (isLogin) {
        const loginData = {
          usernameOrEmail: formData.email,
          password: formData.password
        };
        response = await authAPI.login(loginData);
      } else {
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
        response = await authAPI.signup(signupData);
      }

      if (response.data.success && response.data.token) {
        localStorage.setItem('jwt', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/dashboard');
      } else {
        setError(response.data.message || `${isLogin ? 'Login' : 'Signup'} failed`);
      }
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to authentication server. Please try again later.');
      } else if (err.response) {
        // Prefer server-provided validation/meaningful message
        const serverMsg = err.response.data?.message;
        setError(serverMsg || `Server error: ${err.response.status}`);
      } else {
        setError('Connection failed. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewerJoin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      localStorage.setItem('viewerData', JSON.stringify(viewerData));
      navigate(`/quiz/${viewerData.quizId}/join`);
    } catch (err) {
      setError('Failed to join quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email: '', password: '', name: '', username: '' });
    setError('');
  };

  const toggleViewerMode = () => {
    setShowViewerJoin(!showViewerJoin);
    setViewerData({ quizId: '', name: '' });
    setError('');
  };

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">🎯 Kahoot Quiz</h1>
        
        {!showViewerJoin ? (
          <>
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
                  placeholder={isLogin ? 'Enter your password' : 'At least 6 characters'}
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

            <div className="viewer-section">
              <hr style={{ margin: '20px 0', border: '1px solid #ddd' }} />
              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={toggleViewerMode}
                style={{ marginTop: '10px' }}
              >
                🎮 Join Quiz as Viewer
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="subtitle">Join a quiz as a viewer</p>

            <form onSubmit={handleViewerJoin}>
              <div className="form-group">
                <label htmlFor="quizId">Quiz ID</label>
                <input
                  type="number"
                  id="quizId"
                  name="quizId"
                  value={viewerData.quizId}
                  onChange={handleViewerInputChange}
                  required
                  placeholder="Enter the quiz ID"
                />
              </div>

              <div className="form-group">
                <label htmlFor="viewerName">Your Name</label>
                <input
                  type="text"
                  id="viewerName"
                  name="name"
                  value={viewerData.name}
                  onChange={handleViewerInputChange}
                  required
                  placeholder="Enter your name"
                />
              </div>

              {error && <div className="error">{error}</div>}

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? 'Joining...' : 'Join Quiz'}
              </button>
            </form>

            <div className="toggle-link" onClick={toggleViewerMode}>
              ← Back to Login/Signup
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage; 