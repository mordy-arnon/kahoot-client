import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { viewerAPI } from '../services/api';
import webSocketService from '../services/websocket';

const ViewerPlay = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [viewerSession, setViewerSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
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

    // Initialize WebSocket connection and subscriptions
    initializeWebSocket(session);

    return () => {
      // Cleanup WebSocket subscriptions
      webSocketService.unsubscribe(`/topic/quiz/${quizId}/updates`);
      webSocketService.unsubscribe(`/topic/quiz/${quizId}/question`);
      webSocketService.unsubscribe(`/topic/quiz/${quizId}/results`);
      if (session.sessionId) {
        webSocketService.unsubscribe(`/queue/quiz/${quizId}/viewer/${session.sessionId}`);
      }
    };
  }, [quizId, navigate]);

  useEffect(() => {
    // Timer countdown
    if (timeLeft > 0 && !submitted) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !submitted && currentQuestion) {
      // Time's up! Auto-submit
      handleSubmitAnswer();
    }
  }, [timeLeft, submitted, currentQuestion]);

  const initializeWebSocket = async (session) => {
    try {
      // Connect to WebSocket
      await webSocketService.connect();
      console.log(`🔌 WebSocket connected for viewer in quiz ${quizId}`);

      // Subscribe to quiz updates
      webSocketService.subscribeToQuizUpdates(quizId, handleQuizUpdate);
      
      // Subscribe to new questions
      webSocketService.subscribeToQuestions(quizId, handleNewQuestion);
      
      // Subscribe to quiz results
      webSocketService.subscribeToResults(quizId, handleQuizResults);
      
      // Subscribe to personal updates if we have a session ID
      if (session.sessionId) {
        webSocketService.subscribeToPersonalUpdates(quizId, session.sessionId, handlePersonalUpdate);
      }

      // Get initial quiz status
      await checkInitialStatus();
      
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket:', error);
      // Fallback to HTTP polling if WebSocket fails
      setError('WebSocket connection failed. Using fallback mode...');
      startHttpPolling();
    }
  };

  const handleQuizUpdate = (message) => {
    console.log(`🎮 Quiz update received:`, message);
    
    if (message.type === 'QUIZ_STATUS') {
      if (message.data?.isFinished) {
        setQuizFinished(true);
      }
    } else if (message.type === 'QUIZ_STARTED') {
      setError('Quiz has started! Waiting for first question...');
    } else if (message.type === 'QUIZ_FINISHED') {
      setQuizFinished(true);
    }
  };

  const handleNewQuestion = (message) => {
    console.log(`📝 New question received:`, message);
    
    if (message.type === 'NEW_QUESTION' && message.question) {
      const questionData = message.question;
      const newQuestion = {
        id: questionData.questionId || Date.now(),
        question: questionData.question,
        options: questionData.options,
        timeLimit: questionData.timeLimit || 30
      };
      
      console.log(`📝 Setting new question for quiz ${quizId}:`, {
        questionId: newQuestion.id,
        questionText: newQuestion.question,
        optionsCount: newQuestion.options?.length,
        timeLimit: newQuestion.timeLimit
      });
      
      setCurrentQuestion(newQuestion);
      setTimeLeft(newQuestion.timeLimit);
      setSubmitted(false);
      setSelectedAnswer('');
      setQuestionNumber(prev => prev + 1);
      setError(''); // Clear any error messages
      setLoading(false);
    }
  };

  const handleQuizResults = (message) => {
    console.log(`🏆 Quiz results received:`, message);
    
    if (message.type === 'QUIZ_RESULTS') {
      setQuizFinished(true);
    }
  };

  const handlePersonalUpdate = (message) => {
    console.log(`👤 Personal update received:`, message);
    
    if (message.type === 'ANSWER_SUBMITTED') {
      console.log(`✅ Answer submission confirmed for question ${message.questionId}`);
    }
  };

  const checkInitialStatus = async () => {
    try {
      const response = await viewerAPI.checkQuizStatus(quizId);
      const status = response.data;
      
      console.log(`🎮 Initial status check for quiz ${quizId}:`, status);
      
      if (status.isFinished) {
        setQuizFinished(true);
      } else if (status.currentQuestion && status.currentQuestionText && status.currentQuestionOptions) {
        // There's already a current question
        const newQuestion = {
          id: status.currentQuestion,
          question: status.currentQuestionText,
          options: status.currentQuestionOptions,
          timeLimit: status.timeLeft || 30
        };
        setCurrentQuestion(newQuestion);
        setTimeLeft(status.timeLeft || 30);
      } else if (status.isStarted) {
        setError('Waiting for the first question...');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('❌ Error checking initial status:', err);
      setError('Failed to load quiz status');
      setLoading(false);
    }
  };

  const startHttpPolling = () => {
    // Fallback HTTP polling if WebSocket fails
    const pollInterval = setInterval(async () => {
      try {
        const response = await viewerAPI.checkQuizStatus(quizId);
        const status = response.data;
        
        if (status.isFinished) {
          setQuizFinished(true);
          clearInterval(pollInterval);
        } else if (status.currentQuestion && status.currentQuestionText && status.currentQuestionOptions) {
          if (status.currentQuestion !== currentQuestion?.id) {
            const newQuestion = {
              id: status.currentQuestion,
              question: status.currentQuestionText,
              options: status.currentQuestionOptions,
              timeLimit: status.timeLeft || 30
            };
            setCurrentQuestion(newQuestion);
            setTimeLeft(status.timeLeft || 30);
            setSubmitted(false);
            setSelectedAnswer('');
            setQuestionNumber(prev => prev + 1);
          } else {
            setTimeLeft(status.timeLeft || 0);
          }
        }
      } catch (err) {
        console.error('❌ HTTP polling error:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  };

  const fetchCurrentQuestion = async (questionId) => {
    try {
      // The question data is sent from the creator via the status API
      // We'll get it from the next status check
      console.log('Fetching current question:', questionId);
    } catch (err) {
      console.error('Error fetching question:', err);
      setError('Failed to load question.');
    }
  };

  const handleAnswerSelect = (answer) => {
    if (!submitted) {
      console.log(`✅ Answer selected for quiz ${quizId}:`, answer);
      setSelectedAnswer(answer);
    }
  };

  const handleSubmitAnswer = async () => {
    if (submitted || !currentQuestion) return;

    try {
      setSubmitted(true);
      
      const answerData = {
        quizId: parseInt(quizId),
        questionId: currentQuestion.id,
        answer: selectedAnswer,
        submissionTime: Date.now()
      };

      await viewerAPI.submitAnswer(quizId, answerData);
      
      console.log(`📤 Answer submitted for quiz ${quizId}:`, {
        questionId: currentQuestion.id,
        selectedAnswer: selectedAnswer,
        submissionTime: answerData.submissionTime,
        timeLeft: timeLeft
      });

      // Calculate score (simplified)
      if (selectedAnswer === currentQuestion.correctAnswer) {
        const speedBonus = Math.max(100, Math.floor((timeLeft / currentQuestion.timeLimit) * 1000));
        console.log(`🎯 Correct answer! Points awarded: ${speedBonus}`);
        setScore(prev => prev + speedBonus);
      } else {
        console.log(`❌ Incorrect answer. Correct was: ${currentQuestion.correctAnswer}`);
      }

    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Failed to submit answer.');
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
          <h2>🎯 Loading Quiz...</h2>
          <p>Getting ready...</p>
        </div>
      </div>
    );
  }

  if (quizFinished) {
    return (
      <div className="container">
        <div className="card">
          <h2>🎉 Quiz Finished!</h2>
          
          <div className="final-score">
            <h3>Your Final Score</h3>
            <div className="score-display">{score} points</div>
          </div>

          <div className="quiz-summary">
            <p>Thank you for participating!</p>
            <p>Questions answered: {questionNumber - 1}</p>
          </div>

          <button
            onClick={handleLeaveQuiz}
            className="btn btn-primary btn-full"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="container">
        <div className="card">
          <h2>🎯 Waiting for Next Question...</h2>
          <p>Get ready! The next question is coming up.</p>
          
          <div className="current-score">
            <strong>Current Score: {score} points</strong>
          </div>

          {error && <div className="error">{error}</div>}
        </div>
      </div>
    );
  }

  const getAnswerColor = (index) => {
    const colors = ['#28a745', '#ffc107', '#dc3545', '#17a2b8']; // green, yellow, red, light blue
    return colors[index] || '#6c757d';
  };

  const getAnswerLetter = (index) => {
    return String.fromCharCode(65 + index); // A, B, C, D
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f2f5' }}>
      {/* Header with question and timer */}
      <div style={{ 
        height: '15%', 
        background: '#2c3e50', 
        color: 'white', 
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ width: '100%', maxWidth: '800px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              Question {questionNumber}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: timeLeft <= 5 ? '#e74c3c' : '#2ecc71' }}>
              ⏰ {timeLeft}s
            </div>
            <div style={{ fontSize: '16px' }}>
              Score: {score}
            </div>
          </div>
          
          <h2 style={{ fontSize: '24px', margin: '0', lineHeight: '1.3' }}>
            {currentQuestion.question}
          </h2>
        </div>
      </div>

      {/* Full-screen colored answers (85% of screen) */}
      <div style={{ 
        height: '85%', 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: '2px'
      }}>
        {currentQuestion.options.map((option, index) => (
          <div
            key={index}
            onClick={() => handleAnswerSelect(option)}
            style={{
              backgroundColor: selectedAnswer === option ? 'rgba(255,255,255,0.3)' : getAnswerColor(index),
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
              fontSize: '28px',
              fontWeight: 'bold',
              textAlign: 'center',
              cursor: submitted ? 'not-allowed' : 'pointer',
              position: 'relative',
              transition: 'all 0.3s ease',
              border: selectedAnswer === option ? '5px solid white' : 'none',
              opacity: submitted ? 0.7 : 1,
              userSelect: 'none'
            }}
          >
            <div style={{ 
              position: 'absolute',
              top: '20px',
              left: '20px',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold'
            }}>
              {getAnswerLetter(index)}
            </div>
            
            <div style={{ marginTop: '40px', lineHeight: '1.2', fontSize: '24px' }}>
              {option}
            </div>
            
            {selectedAnswer === option && (
              <div style={{ 
                position: 'absolute',
                top: '20px',
                right: '20px',
                fontSize: '40px'
              }}>
                ✓
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Status messages */}
      {submitted && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '20px 40px',
          borderRadius: '10px',
          textAlign: 'center',
          fontSize: '20px',
          zIndex: 1000
        }}>
          ✅ Answer submitted! Waiting for next question...
        </div>
      )}

      {error && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#dc3545',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '5px',
          zIndex: 1000
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ViewerPlay; 