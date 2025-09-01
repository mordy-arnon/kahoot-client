import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { quizAPI, viewerAPI, authAPI } from '../services/api';

const Dashboard = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [newQuiz, setNewQuiz] = useState({ title: '', description: '' });
  const [quizStatuses, setQuizStatuses] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [quizQuestions, setQuizQuestions] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState({});
  const [quizViewers, setQuizViewers] = useState({});
  const navigate = useNavigate();

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard: ' + text);
    } catch (e) {
      // Fallback
      const temp = document.createElement('textarea');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      alert('Copied to clipboard: ' + text);
    }
  };

  useEffect(() => {
    validateTokenAndLoadQuizzes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateTokenAndLoadQuizzes = async () => {
    try {
      await authAPI.validateToken();
      await loadQuizzes();
    } catch (err) {
      handleLogout();
    }
  };

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const response = await quizAPI.getAllQuizzes();
      const quizzesData = Array.isArray(response.data) ? response.data : [];
      setQuizzes(quizzesData);
      await loadQuizStatuses(quizzesData);
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        setError('Failed to load quizzes');
        setQuizzes([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadQuizStatuses = async (quizzesData) => {
    const statuses = {};
    for (const quiz of quizzesData) {
      try {
        const response = await viewerAPI.checkQuizStatus(quiz.id);
        statuses[quiz.id] = response.data;
      } catch (_) {
        statuses[quiz.id] = { isOpen: false, isStarted: false, message: 'Not opened for viewers yet' };
      }
    }
    setQuizStatuses(statuses);
  };

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
      setQuizzes([createdQuiz, ...quizzes]);
      setQuizStatuses((prev) => ({ ...prev, [createdQuiz.id]: { isOpen: false, isStarted: false, message: 'Not opened for viewers yet' } }));
      setNewQuiz({ title: '', description: '' });
      setShowCreateQuiz(false);
      navigate(`/quiz/${createdQuiz.id}/questions`);
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        setError(err.response?.data?.message || 'Failed to create quiz');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQuiz = async (quizId, quizTitle) => {
    try {
      setActionLoading((prev) => ({ ...prev, [`open-${quizId}`]: true }));
      const response = await viewerAPI.openQuiz(quizId, { title: quizTitle });
      if (response.data.success) {
        // Immediately verify with viewer service real status
        try {
          const statusResp = await viewerAPI.checkQuizStatus(quizId);
          console.log(`📊 Quiz ${quizId} opened - Status response:`, statusResp.data);
          setQuizStatuses((prev) => ({
            ...prev,
            [quizId]: statusResp.data,
          }));
        } catch (verifyErr) {
          console.error(`❌ Quiz ${quizId} status verification error:`, verifyErr);
          // Fallback to optimistic status with hint
          setQuizStatuses((prev) => ({
            ...prev,
            [quizId]: { isOpen: true, isStarted: false, message: 'Quiz is open for joining (verification pending)' },
          }));
        }
      } else {
        setError(response.data.message || 'Failed to open quiz');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        setError(`Failed to open quiz: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [`open-${quizId}`]: false }));
    }
  };

  const handleStartQuiz = async (quizId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [`start-${quizId}`]: true }));
      
      // Load questions first
      await loadQuizQuestions(quizId);
      
      const response = await viewerAPI.startQuiz(quizId);
      if (response.data.success) {
        setQuizStatuses((prev) => ({
          ...prev,
          [quizId]: { ...prev[quizId], isStarted: true, message: 'Quiz has started' },
        }));
        setCurrentQuestionIndex((prev) => ({ ...prev, [quizId]: 0 }));
        
        // Redirect to game screen
        navigate(`/quiz/${quizId}/game`);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        setError(`Failed to start quiz: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [`start-${quizId}`]: false }));
    }
  };

  const loadQuizQuestions = async (quizId) => {
    try {
      const response = await quizAPI.getQuestions(quizId);
      setQuizQuestions((prev) => ({ ...prev, [quizId]: response.data }));
    } catch (err) {
      console.error('Failed to load questions:', err);
      setError(`Failed to load questions: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleNextQuestion = async (quizId) => {
    try {
      const questions = quizQuestions[quizId];
      const currentIndex = currentQuestionIndex[quizId] || 0;
      
      if (!questions || currentIndex >= questions.length) {
        setError('No more questions available');
        return;
      }

      const question = questions[currentIndex];
      setActionLoading((prev) => ({ ...prev, [`next-${quizId}`]: true }));
      
      const questionData = {
        question: question.question,
        options: [question.option1, question.option2, question.option3, question.option4],
        correctAnswer: question.correctAnswer,
        timeLimit: question.timeLimit || 30
      };

      const response = await viewerAPI.nextQuestion(quizId, question.id, questionData);
      if (response.data.success) {
        setCurrentQuestionIndex((prev) => ({ ...prev, [quizId]: currentIndex + 1 }));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        setError(`Failed to advance question: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [`next-${quizId}`]: false }));
    }
  };

  const handleFinishQuiz = async (quizId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [`finish-${quizId}`]: true }));
      const response = await viewerAPI.finishQuiz(quizId);
      if (response.data.success) {
        setQuizStatuses((prev) => ({
          ...prev,
          [quizId]: { ...prev[quizId], isFinished: true, message: 'Quiz has finished' },
        }));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        setError(`Failed to finish quiz: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [`finish-${quizId}`]: false }));
    }
  };

  const handleGetViewers = async (quizId) => {
    try {
      const response = await viewerAPI.getViewers(quizId);
      if (response.data.success) {
        const viewers = response.data.viewers || [];
        console.log(`👥 Quiz ${quizId} viewers updated:`, viewers.map(v => ({ name: v.name, score: v.totalScore })));
        setQuizViewers((prev) => ({ ...prev, [quizId]: viewers }));
        return viewers;
      } else {
        console.log(`👥 Quiz ${quizId} no viewers found`);
        setQuizViewers((prev) => ({ ...prev, [quizId]: [] }));
        return [];
      }
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        console.error(`Failed to get viewers: ${err.response?.data?.message || err.message}`);
        setQuizViewers((prev) => ({ ...prev, [quizId]: [] }));
        return [];
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    localStorage.removeItem('questionCount');
    navigate('/');
  };

  // Auto-refresh viewers for open quizzes
  useEffect(() => {
    const interval = setInterval(() => {
      Object.entries(quizStatuses).forEach(([quizId, status]) => {
        if (status?.isOpen) {
          handleGetViewers(parseInt(quizId));
        }
      });
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizStatuses]);

  const getQuizStatusBadge = (status) => {
    if (!status) return null;
    if (status.isStarted) return <span style={{ padding: '4px 8px', backgroundColor: '#28a745', color: 'white', borderRadius: '4px', fontSize: '12px' }}>▶️ Started</span>;
    if (status.isOpen) return <span style={{ padding: '4px 8px', backgroundColor: '#17a2b8', color: 'white', borderRadius: '4px', fontSize: '12px' }}>🟢 Open</span>;
    return <span style={{ padding: '4px 8px', backgroundColor: '#6c757d', color: 'white', borderRadius: '4px', fontSize: '12px' }}>⭕ Closed</span>;
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
          <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
        </div>



        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#2d3748', margin: 0 }}>Your Quizzes ({quizzes?.length || 0})</h2>
          <button onClick={() => setShowCreateQuiz(!showCreateQuiz)} className="btn btn-primary">
            {showCreateQuiz ? '❌ Cancel' : '➕ Create New Quiz'}
          </button>
        </div>

        {showCreateQuiz && (
          <div style={{ marginBottom: '30px', padding: '20px', background: '#f0fff4', borderRadius: '10px', border: '1px solid #c6f6d5' }}>
            <h3 style={{ color: '#2d3748', marginBottom: '15px' }}>Create New Quiz</h3>
            <form onSubmit={handleCreateQuiz}>
              <div className="form-group">
                <label htmlFor="quizTitle">Quiz Title</label>
                <input type="text" id="quizTitle" value={newQuiz.title} onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })} placeholder="Enter quiz title" required />
              </div>
              <div className="form-group">
                <label htmlFor="quizDescription">Description (optional)</label>
                <textarea id="quizDescription" value={newQuiz.description} onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })} placeholder="Enter quiz description" rows="3" style={{ width: '100%', padding: '12px 16px', border: '2px solid #e1e5e9', borderRadius: '8px', fontSize: '16px', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Quiz'}</button>
                <button type="button" onClick={() => setShowCreateQuiz(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {error && <div className="error" style={{ marginBottom: '20px' }}>{error}</div>}

        {!quizzes || quizzes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#f7fafc', borderRadius: '10px' }}>
            <h3 style={{ color: '#4a5568', marginBottom: '15px' }}>No quizzes yet</h3>
            <p style={{ color: '#718096', marginBottom: '20px' }}>Create your first quiz to get started with building questions.</p>
            <button onClick={() => setShowCreateQuiz(true)} className="btn btn-primary">Create Your First Quiz</button>
          </div>
        ) : (
          <div className="quizzes-list">
            {quizzes && quizzes.map((quiz) => {
              const status = quizStatuses[quiz.id];
              const joinUrl = `${window.location.origin}/quiz/${quiz.id}/join`;
              return (
                <div key={quiz.id} className="question-card" style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <h3 style={{ color: '#2d3748', margin: 0 }}>📝 {quiz.title || 'Untitled Quiz'}</h3>
                        {getQuizStatusBadge(status)}
                      </div>
                      {quiz.description && <p style={{ color: '#6c757d', marginBottom: '15px' }}>{quiz.description}</p>}

                      {/* Viewer Status Information */}
                      {status && (
                        <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px', fontSize: '14px' }}>
                          <strong>Viewer Status:</strong> {status.message}

                          {status.isOpen && (
                            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div>
                                <strong>Share this code:</strong> <span style={{ fontFamily: 'monospace' }}>{quiz.id}</span>
                                <button className="btn btn-secondary" style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '12px' }} onClick={() => copyText(String(quiz.id))}>Copy Code</button>
                              </div>
                              <div>
                                <strong>Direct join link:</strong> <a href={joinUrl} target="_blank" rel="noreferrer">{joinUrl}</a>
                                <button className="btn btn-secondary" style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '12px' }} onClick={() => copyText(joinUrl)}>Copy Link</button>
                              </div>
                            </div>
                          )}
                          {!status.isOpen && (
                            <div style={{ marginTop: '6px', color: '#6c757d' }}>Open the quiz to generate the shareable code and link.</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginLeft: '20px', minWidth: '200px' }}>
                      {/* Quiz Management Buttons */}
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {quiz.id && (
                          <>
                            <Link to={`/quiz/${quiz.id}/questions`} className="btn btn-primary" style={{ textDecoration: 'none', padding: '6px 10px', fontSize: '12px', flex: 1 }}>📝 Questions</Link>
                            <Link to={`/quiz/${quiz.id}/question/new`} className="btn btn-secondary" style={{ textDecoration: 'none', padding: '6px 10px', fontSize: '12px', flex: 1 }}>➕ Add</Link>
                          </>
                        )}
                      </div>

                      {/* Viewer Control Buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {status && !status.isOpen && (
                          <button onClick={() => handleOpenQuiz(quiz.id, quiz.title)} className="btn btn-success" disabled={actionLoading[`open-${quiz.id}`]} style={{ padding: '8px 12px', fontSize: '13px' }}>
                            {actionLoading[`open-${quiz.id}`] ? '🔄 Opening...' : '🔓 Open for Viewers'}
                          </button>
                        )}

                        {status && status.isOpen && !status.isStarted && (
                          <button onClick={() => handleStartQuiz(quiz.id)} className="btn btn-warning" disabled={actionLoading[`start-${quiz.id}`]} style={{ padding: '8px 12px', fontSize: '13px' }}>
                            {actionLoading[`start-${quiz.id}`] ? '🔄 Starting...' : '▶️ Start Quiz'}
                          </button>
                        )}

                        {status && status.isStarted && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div style={{ padding: '6px 10px', fontSize: '12px', textAlign: 'center', backgroundColor: '#d4edda', color: '#155724', borderRadius: '5px' }}>
                              ✅ Quiz Running
                            </div>
                            
                            {/* Question Navigation */}
                            {quizQuestions[quiz.id] && (
                              <div style={{ fontSize: '11px', textAlign: 'center', color: '#666', marginBottom: '5px' }}>
                                Question {(currentQuestionIndex[quiz.id] || 0) + 1} of {quizQuestions[quiz.id].length}
                              </div>
                            )}
                            
                            {quizQuestions[quiz.id] && currentQuestionIndex[quiz.id] < quizQuestions[quiz.id].length && (
                              <button 
                                onClick={() => handleNextQuestion(quiz.id)} 
                                className="btn btn-primary" 
                                disabled={actionLoading[`next-${quiz.id}`]}
                                style={{ padding: '6px 10px', fontSize: '12px' }}
                              >
                                {actionLoading[`next-${quiz.id}`] ? '🔄 Loading...' : '➡️ Next Question'}
                              </button>
                            )}
                            
                            {quizQuestions[quiz.id] && currentQuestionIndex[quiz.id] >= quizQuestions[quiz.id].length && (
                              <button 
                                onClick={() => handleFinishQuiz(quiz.id)} 
                                className="btn btn-danger" 
                                disabled={actionLoading[`finish-${quiz.id}`]}
                                style={{ padding: '6px 10px', fontSize: '12px' }}
                              >
                                {actionLoading[`finish-${quiz.id}`] ? '🔄 Finishing...' : '🏁 Finish Quiz'}
                              </button>
                            )}
                          </div>
                        )}

                        {status && status.isOpen && (
                          <div style={{ padding: '8px', backgroundColor: '#e8f5e8', borderRadius: '5px', marginTop: '5px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#155724', marginBottom: '5px' }}>
                              👥 Participants ({(quizViewers[quiz.id] || []).length})
                            </div>
                            <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '11px' }}>
                              {(quizViewers[quiz.id] || []).length === 0 ? (
                                <div style={{ color: '#6c757d', fontStyle: 'italic' }}>Waiting for viewers to join...</div>
                              ) : (
                                quizViewers[quiz.id].map((viewer, index) => (
                                  <div key={index} style={{ padding: '2px 0', borderBottom: index < quizViewers[quiz.id].length - 1 ? '1px solid #ddd' : 'none' }}>
                                    • {viewer.name} {viewer.totalScore !== undefined ? `(${viewer.totalScore} pts)` : ''}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 