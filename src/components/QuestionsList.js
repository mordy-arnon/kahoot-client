import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { quizAPI } from '../services/api';

const QuestionsList = () => {
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]); // Always initialize as empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { quizId } = useParams();
  
  console.log('🔍 QuestionsList render - Current state:', { 
    quizId, 
    questionsLength: questions?.length || 0, 
    questionsType: typeof questions,
    questionsIsArray: Array.isArray(questions),
    loading, 
    error 
  });

  useEffect(() => {
    loadQuizAndQuestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const loadQuizAndQuestions = async () => {
    try {
      setLoading(true);
      
      console.log('📋 QuestionsList - Loading quiz and questions for quizId:', quizId);
      
      // Load quiz details and questions in parallel
      const [quizResponse, questionsResponse] = await Promise.all([
        quizAPI.getQuiz(quizId),
        quizAPI.getQuestions(quizId)
      ]);
      
      console.log('✅ Quiz loaded:', quizResponse.data);
      console.log('✅ Questions loaded:', questionsResponse.data);
      
      setQuiz(quizResponse.data || null);
      setQuestions(Array.isArray(questionsResponse.data) ? questionsResponse.data : []);
    } catch (err) {
      console.error('❌ Error loading quiz:', err);
      setError('Failed to load quiz and questions');
      setQuestions([]); // Ensure questions is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    navigate('/');
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        // For now, we'll just refresh the list
        // In a real app, you'd implement a DELETE endpoint
        setQuestions(questions.filter(q => q.id !== questionId));
      } catch (err) {
        setError('Failed to delete question');
      }
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <div className="error">{error}</div>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '900px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 className="title" style={{ margin: 0, fontSize: '2rem' }}>
              📝 {quiz?.title || 'Quiz Questions'}
            </h1>
            {quiz?.description && (
              <p className="subtitle" style={{ margin: '10px 0 0 0' }}>{quiz.description}</p>
            )}
          </div>
          <div>
            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ marginRight: '10px' }}>
              Dashboard
            </button>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#2d3748', margin: 0 }}>Questions ({questions?.length || 0})</h2>
          <Link 
            to={`/quiz/${quizId}/question/new`} 
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            ➕ Add New Question
          </Link>
        </div>

        {!questions || questions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#f7fafc', borderRadius: '10px' }}>
            <h3 style={{ color: '#4a5568', marginBottom: '15px' }}>No questions yet</h3>
            <p style={{ color: '#718096', marginBottom: '20px' }}>
              Start building your quiz by adding your first question.
            </p>
            <Link 
              to={`/quiz/${quizId}/question/new`} 
              className="btn btn-primary"
              style={{ textDecoration: 'none' }}
            >
              Create First Question
            </Link>
          </div>
        ) : (
          <div className="questions-list">
            {questions && questions.map((question, index) => (
              <div key={question.id} className="question-card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: '#2d3748', marginBottom: '15px' }}>
                      Question {index + 1}: {question.questionText}
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                      {question.options && question.options.map((option, optIndex) => (
                                                 <div 
                           key={optIndex} 
                           style={{ 
                             padding: '8px 12px', 
                             borderRadius: '6px',
                             background: optIndex === (question.correctAnswerIndex ?? 0) ? '#d4edda' : '#f8f9fa',
                             border: optIndex === (question.correctAnswerIndex ?? 0) ? '2px solid #28a745' : '1px solid #dee2e6',
                             fontWeight: optIndex === (question.correctAnswerIndex ?? 0) ? 'bold' : 'normal'
                           }}
                         >
                           <span style={{ color: '#6c757d', fontSize: '12px' }}>
                             {String.fromCharCode(65 + optIndex)}:
                           </span>{' '}
                           {option || 'Empty option'}
                           {optIndex === (question.correctAnswerIndex ?? 0) && (
                             <span style={{ color: '#28a745', marginLeft: '5px' }}>✓</span>
                           )}
                         </div>
                      ))}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#6c757d' }}>
                      <span>⏱️ {question.timeLimit || 30}s</span>
                      <span>🏆 {question.points || 10} points</span>
                      <span>📊 Order: {question.questionOrder || index + 1}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', marginLeft: '20px' }}>
                    <Link 
                      to={`/quiz/${quizId}/question/${question.id}/edit`}
                      className="btn btn-secondary"
                      style={{ textDecoration: 'none', padding: '8px 12px', fontSize: '14px' }}
                      onClick={() => {
                        console.log('🔗 QuestionsList - Navigating to edit question:', {
                          quizId,
                          questionId: question.id,
                          questionData: question
                        });
                      }}
                    >
                      ✏️ Edit
                    </Link>
                    <button 
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '14px', background: '#f8d7da', color: '#721c24' }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <Link 
            to="/dashboard" 
            className="btn btn-secondary"
            style={{ textDecoration: 'none', marginRight: '10px' }}
          >
            ← Back to Dashboard
          </Link>
          <Link 
            to={`/quiz/${quizId}/question/new`} 
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            Add Another Question
          </Link>
        </div>
      </div>
    </div>
  );
};

export default QuestionsList; 