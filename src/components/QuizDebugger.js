import React, { useState } from 'react';
import { viewerAPI } from '../services/api';

const QuizDebugger = () => {
  const [quizId, setQuizId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkQuizStatus = async () => {
    if (!quizId) return;
    
    setLoading(true);
    try {
      const response = await viewerAPI.checkQuizStatus(parseInt(quizId));
      setResult({
        type: 'status',
        success: true,
        data: response.data
      });
    } catch (error) {
      setResult({
        type: 'status',
        success: false,
        error: error.response?.data || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const openQuiz = async () => {
    if (!quizId) return;
    
    setLoading(true);
    try {
      const response = await viewerAPI.openQuiz(parseInt(quizId), { title: `Test Quiz ${quizId}` });
      setResult({
        type: 'open',
        success: true,
        data: response.data
      });
    } catch (error) {
      setResult({
        type: 'open',
        success: false,
        error: error.response?.data || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', margin: '20px 0' }}>
      <h3>🔍 Quiz Debugger</h3>
      <div style={{ marginBottom: '15px' }}>
        <input
          type="number"
          value={quizId}
          onChange={(e) => setQuizId(e.target.value)}
          placeholder="Enter Quiz ID (e.g., 2)"
          style={{ padding: '8px', marginRight: '10px', width: '150px' }}
        />
        <button onClick={checkQuizStatus} disabled={loading || !quizId} style={{ marginRight: '10px' }}>
          {loading ? 'Checking...' : 'Check Status'}
        </button>
        <button onClick={openQuiz} disabled={loading || !quizId}>
          {loading ? 'Opening...' : 'Open Quiz'}
        </button>
      </div>

      {result && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: result.success ? '#d4edda' : '#f8d7da', 
          border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '5px'
        }}>
          <h4>{result.type === 'status' ? '📊 Status Check Result' : '🔓 Open Quiz Result'}</h4>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
            {JSON.stringify(result.success ? result.data : result.error, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
        <strong>Debug Info:</strong>
        <ul>
          <li>Token in localStorage: {localStorage.getItem('jwt') ? '✅ Present' : '❌ Missing'}</li>
          <li>User in localStorage: {localStorage.getItem('user') ? '✅ Present' : '❌ Missing'}</li>
          <li>Viewer API URL: {process.env.REACT_APP_VIEWER_API_URL || 'http://localhost:8081'}</li>
        </ul>
      </div>
    </div>
  );
};

export default QuizDebugger;