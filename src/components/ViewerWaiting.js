import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { viewerAPI } from '../services/api';

const ViewerWaiting = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [viewerSession, setViewerSession] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [quizStatus, setQuizStatus] = useState('WAITING');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get viewer session from localStorage
    const storedSession = localStorage.getItem('viewerSession');
    if (!storedSession) {
      navigate(`/quiz/${quizId}/join`);
      return;
    }

    const session = JSON.parse(storedSession);
    setViewerSession(session);

    // Start polling for updates
    const pollInterval = setInterval(() => {
      checkQuizStatus();
      fetchViewers();
    }, 2000); // Poll every 2 seconds

    // Initial fetch
    checkQuizStatus();
    fetchViewers();

    return () => clearInterval(pollInterval);
  }, [quizId, navigate]);

  const checkQuizStatus = async () => {
    try {
      const response = await viewerAPI.checkQuizStatus(quizId);
      setQuizStatus(response.data);
      
      if (response.data.isStarted && quizStatus !== 'STARTED') {
        // Quiz has started, navigate to play screen
        navigate(`/quiz/${quizId}/play`);
      }
    } catch (err) {
      console.error('Error checking quiz status:', err);
      setError('Connection lost. Trying to reconnect...');
    } finally {
      setLoading(false);
    }
  };

  const fetchViewers = async () => {
    try {
      const response = await viewerAPI.getViewers(quizId);
      if (response.data.success) {
        setViewers(response.data.viewers);
      }
    } catch (err) {
      console.error('Error fetching viewers:', err);
    }
  };

  const handleLeaveQuiz = () => {
    localStorage.removeItem('viewerSession');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <h2>🎯 Loading...</h2>
          <p>Connecting to quiz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h2>🎯 Waiting for Quiz to Start</h2>
        
        {viewerSession && (
          <div className="viewer-info">
            <p><strong>Welcome, {viewerSession.name}!</strong></p>
            <p>Quiz ID: {quizId}</p>
            <p>Status: Waiting for the quiz owner to start the quiz...</p>
          </div>
        )}

        <div className="waiting-animation" style={{ textAlign: 'center', margin: '30px 0' }}>
          <div className="spinner">⏳</div>
          <p>Get ready! The quiz will start soon.</p>
        </div>

        <div className="viewers-list">
          <h3>Other Participants ({viewers.length})</h3>
          {viewers.length > 0 ? (
            <div className="viewers-grid">
              {viewers.map((viewer, index) => (
                <div key={viewer.sessionId || index} className="viewer-card">
                  <div className="viewer-name">{viewer.name}</div>
                  <div className="viewer-status">
                    {viewer.status === 'CONNECTED' ? '🟢' : '🔴'} 
                    {viewer.status?.toLowerCase() || 'connected'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>You're the first one here! Others will join soon.</p>
          )}
        </div>

        {error && <div className="error">{error}</div>}

        <div className="actions" style={{ marginTop: '30px' }}>
          <button
            onClick={handleLeaveQuiz}
            className="btn btn-secondary"
          >
            Leave Quiz
          </button>
        </div>
      </div>

      <style jsx>{`
        .waiting-animation .spinner {
          font-size: 2em;
          animation: spin 2s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .viewers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
          margin-top: 15px;
        }
        
        .viewer-card {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
          background: #f9f9f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .viewer-name {
          font-weight: bold;
        }
        
        .viewer-status {
          font-size: 0.9em;
          color: #666;
        }
        
        .viewer-info {
          background: #e8f4fd;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};

export default ViewerWaiting; 