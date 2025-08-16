import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { viewerAPI } from '../services/api';

const ViewerJoin = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quizStatus, setQuizStatus] = useState(null);
  const [viewerData, setViewerData] = useState({ quizId: '', name: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const storedViewerData = localStorage.getItem('viewerData');
    if (storedViewerData) {
      const parsed = JSON.parse(storedViewerData);
      setViewerData(parsed);
    }
    checkQuizStatus();
  }, [quizId]);

  const checkQuizStatus = async () => {
    try {
      setLoading(true);
      const response = await viewerAPI.checkQuizStatus(quizId);
      setQuizStatus(response.data);
      if (response.data.isStarted) {
        setError('This quiz has already started and cannot accept new viewers.');
      } else if (!response.data.isOpen) {
        setError('This quiz is not currently open for viewers. Please verify the code with the creator or wait for them to open it.');
      }
    } catch (err) {
      setError('Failed to check quiz status. Please verify the quiz ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQuiz = async () => {
    if (!viewerData.name.trim()) {
      setError('Please enter your name');
      return;
    }
    try {
      setJoining(true);
      setError('');
      const joinData = { quizId: parseInt(quizId), name: viewerData.name.trim() };
      const response = await viewerAPI.joinQuiz(quizId, joinData);
      if (response.data.success) {
        localStorage.setItem('viewerSession', JSON.stringify({ sessionId: response.data.sessionId, quizId: quizId, name: viewerData.name, joinedAt: new Date().toISOString() }));
        navigate(`/quiz/${quizId}/waiting`);
      } else {
        setError(response.data.message || 'Failed to join quiz');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join quiz. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleNameChange = (e) => {
    setViewerData(prev => ({ ...prev, name: e.target.value }));
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <h2>🎯 Joining Quiz</h2>
          <p>Checking quiz status...</p>
        </div>
      </div>
    );
  }

  const joinHint = `Ask the quiz creator for the quiz code. It\'s shown on their dashboard after they open the quiz. Your code is the number like "${quizId || '123'}".`;

  return (
    <div className="container">
      <div className="card">
        <h2>🎯 Join Quiz</h2>
        {quizStatus && (
          <div className="quiz-info">
            <h3>{quizStatus.quizTitle || 'Quiz'}</h3>
            <p><strong>Quiz ID:</strong> {quizId}</p>
            <p><strong>Status:</strong> {quizStatus.message}</p>
          </div>
        )}

        <div className="hint" style={{ background: '#f8f9fa', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', color: '#4a5568' }}>
          💡 {joinHint}
        </div>

        {quizStatus?.isOpen && !quizStatus.isStarted && (
          <div className="join-form">
            <div className="form-group">
              <label htmlFor="viewerName">Your Name</label>
              <input type="text" id="viewerName" value={viewerData.name} onChange={handleNameChange} placeholder="Enter your name" disabled={joining} />
            </div>

            <button onClick={handleJoinQuiz} className="btn btn-primary btn-full" disabled={joining || !viewerData.name.trim()}>
              {joining ? 'Joining...' : 'Join Quiz'}
            </button>
          </div>
        )}

        {error && <div className="error" style={{ marginTop: '15px' }}>{error}</div>}

        <div className="actions" style={{ marginTop: '20px' }}>
          <button onClick={() => navigate('/')} className="btn btn-secondary">← Back to Home</button>
          <button onClick={checkQuizStatus} className="btn btn-secondary" disabled={loading} style={{ marginLeft: '10px' }}>🔄 Refresh Status</button>
        </div>
      </div>
    </div>
  );
};

export default ViewerJoin; 