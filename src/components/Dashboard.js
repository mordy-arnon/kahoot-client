import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { quizAPI } from '../services/api';

const Dashboard = () => {
  const [quizzes, setQuizzes] = useState([]); // Always initialize as empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [newQuiz, setNewQuiz] = useState({ title: '', description: '' });
  const navigate = useNavigate();
  
  console.log('🔍 Dashboard render - Current state:', { 
    quizzesLength: quizzes?.length || 0, 
    quizzesType: typeof quizzes,
    quizzesIsArray: Array.isArray(quizzes),
    loading, 
    error,
    showCreateQuiz
  });

  const loadQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setError(''); // Clear any existing errors
      console.log('📋 Dashboard - Loading quizzes');
      
      // Extract owner ID from JWT token stored in localStorage
      const jwt = localStorage.getItem('jwt');
      const ownerId = jwt ? jwt.replace('temp_token_', '') : null;
      
      if (!ownerId) {
        setError('No user ID found. Please log in again.');
        navigate('/');
        return;
      }
      
      console.log('📋 Dashboard - Loading quizzes for owner:', ownerId);
      const response = await quizAPI.getAllQuizzes(ownerId);
      console.log('✅ Quizzes loaded:', response.data);
      
      // Handle successful response
      const quizzesData = response.data;
      if (Array.isArray(quizzesData)) {
        setQuizzes(quizzesData);
        console.log(`📊 Found ${quizzesData.length} quizzes for user`);
      } else {
        // Handle case where response.data is not an array (e.g., null, undefined, or empty object)
        setQuizzes([]);
        console.log('📊 No quizzes found for user (non-array response)');
      }
      
    } catch (err) {
      console.error('❌ Error loading quizzes:', err);
      
      // Check if this is a 404 (no quizzes found) or a real error
      if (err.response && err.response.status === 404) {
        console.log('📊 No quizzes found for user (404 response)');
        setQuizzes([]);
        // Don't set error for 404 - this is normal when user has no quizzes
      } else {
        // Real error - network issues, server errors, etc.
        setError('Failed to load quizzes. Please try again.');
        setQuizzes([]); // Ensure quizzes is always an array
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    setError('');

    if (!newQuiz.title.trim()) {
      setError('Please enter a quiz title');
      return;
    }

    try {
      setLoading(true);
      const response = await quizAPI.createQuiz(newQuiz);
      const createdQuiz = response.data;
      
      // Add to local state
      setQuizzes([createdQuiz, ...quizzes]);
      
      // Reset form
      setNewQuiz({ title: '', description: '' });
      setShowCreateQuiz(false);
      
      // Navigate to questions for the new quiz
      navigate(`/quiz/${createdQuiz.id}/questions`);
    } catch (err) {
      console.error('Error creating quiz:', err);
      setError(err.response?.data?.message || 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('questionCount');
    navigate('/');
  };

  if (loading && quizzes.length === 0) {
    return (
      <div className="container">
        <div className="card">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '900px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 className="title" style={{ margin: 0 }}>🎯 Quiz Dashboard</h1>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#2d3748', margin: 0 }}>Your Quizzes ({quizzes?.length || 0})</h2>
          <button 
            onClick={() => setShowCreateQuiz(!showCreateQuiz)} 
            className="btn btn-primary"
          >
            {showCreateQuiz ? '❌ Cancel' : '➕ Create New Quiz'}
          </button>
        </div>

        {showCreateQuiz && (
          <div style={{ marginBottom: '30px', padding: '20px', background: '#f0fff4', borderRadius: '10px', border: '1px solid #c6f6d5' }}>
            <h3 style={{ color: '#2d3748', marginBottom: '15px' }}>Create New Quiz</h3>
            <form onSubmit={handleCreateQuiz}>
              <div className="form-group">
                <label htmlFor="quizTitle">Quiz Title</label>
                <input
                  type="text"
                  id="quizTitle"
                  value={newQuiz.title}
                  onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                  placeholder="Enter quiz title"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="quizDescription">Description (optional)</label>
                <textarea
                  id="quizDescription"
                  value={newQuiz.description}
                  onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
                  placeholder="Enter quiz description"
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e1e5e9',
                    borderRadius: '8px',
                    fontSize: '16px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Quiz'}
                </button>
                <button type="button" onClick={() => setShowCreateQuiz(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {error && <div className="error" style={{ marginBottom: '20px' }}>{error}</div>}

        {!quizzes || quizzes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#f7fafc', borderRadius: '10px' }}>
            <h3 style={{ color: '#4a5568', marginBottom: '15px' }}>No quizzes yet</h3>
            <p style={{ color: '#718096', marginBottom: '20px' }}>
              Create your first quiz to get started with building questions.
            </p>
            <button onClick={() => setShowCreateQuiz(true)} className="btn btn-primary">
              Create Your First Quiz
            </button>
          </div>
        ) : (
          <div className="quizzes-list">
            {quizzes && quizzes.map((quiz) => (
              <div key={quiz.id} className="question-card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: '#2d3748', marginBottom: '10px' }}>
                      📝 {quiz.title || 'Untitled Quiz'}
                    </h3>
                    {quiz.description && (
                      <p style={{ color: '#6c757d', marginBottom: '15px' }}>
                        {quiz.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#6c757d' }}>
                      <span>📅 Created: {quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString() : 'Unknown'}</span>
                      <span>❓Questions: {quiz.questions?.length || 0}</span>
                      <span>👤 Creator: {quiz.creator?.username || 'Unknown'}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', marginLeft: '20px' }}>
                    {quiz.id && (
                      <>
                        <Link 
                          to={`/quiz/${quiz.id}/questions`}
                          className="btn btn-primary"
                          style={{ textDecoration: 'none', padding: '8px 12px', fontSize: '14px' }}
                        >
                          📝 Manage Questions
                        </Link>
                        <Link 
                          to={`/quiz/${quiz.id}/question/new`}
                          className="btn btn-secondary"
                          style={{ textDecoration: 'none', padding: '8px 12px', fontSize: '14px' }}
                        >
                          ➕ Add Question
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}


      </div>
    </div>
  );
};

export default Dashboard; 