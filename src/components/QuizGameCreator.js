import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizAPI, viewerAPI, authAPI } from '../services/api';

const QuizGameCreator = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameFinished, setGameFinished] = useState(false);
  const [questionSent, setQuestionSent] = useState(false);

  useEffect(() => {
    validateTokenAndLoadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !showCorrectAnswer) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && currentQuestion && !showCorrectAnswer) {
      // Time's up! Show correct answer
      handleTimeUp();
    }
  }, [timeLeft, showCorrectAnswer, currentQuestion]);

  // Auto-refresh viewers
  useEffect(() => {
    if (currentQuestion) {
      const interval = setInterval(() => {
        loadViewers();
      }, 2000); // Refresh every 2 seconds
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion]);

  const validateTokenAndLoadData = async () => {
    try {
      await authAPI.validateToken();
      await loadQuizData();
    } catch (err) {
      handleLogout();
    }
  };

  const loadQuizData = async () => {
    try {
      setLoading(true);
      
      // Load quiz details
      const quizResponse = await quizAPI.getQuiz(quizId);
      setQuiz(quizResponse.data);
      
      // Load questions
      const questionsResponse = await quizAPI.getQuestions(quizId);
      const questionsData = questionsResponse.data || [];
      setQuestions(questionsData);
      
      if (questionsData.length > 0) {
        setCurrentQuestion(questionsData[0]);
        setTimeLeft(questionsData[0].timeLimit || 30);
        
        // Don't automatically send the first question - wait for creator to manually advance
        console.log(`🎮 Quiz ${quizId} loaded with ${questionsData.length} questions. First question ready to send.`);
      }
      
      // Load viewers
      await loadViewers();
      
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        setError(`Failed to load quiz data: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadViewers = async () => {
    try {
      const response = await viewerAPI.getViewers(quizId);
      if (response.data.success) {
        const viewers = response.data.viewers || [];
        console.log(`👥 Creator game screen - viewers updated for quiz ${quizId}:`, viewers.map(v => ({ name: v.name, score: v.totalScore, answered: !!v.currentAnswer })));
        setViewers(viewers);
      }
    } catch (err) {
      console.error('Failed to load viewers:', err);
    }
  };

  const handleStartFirstQuestion = async () => {
    try {
      if (!currentQuestion) {
        setError('No question available to start');
        return;
      }

      const questionData = {
        question: currentQuestion.question,
        options: [currentQuestion.option1, currentQuestion.option2, currentQuestion.option3, currentQuestion.option4],
        correctAnswer: currentQuestion.correctAnswer,
        timeLimit: currentQuestion.timeLimit || 30
      };

      await viewerAPI.nextQuestion(quizId, currentQuestion.id, questionData);
      
      console.log(`🎮 First question sent to viewers for quiz ${quizId}:`, {
        questionId: currentQuestion.id,
        questionText: questionData.question,
        optionsCount: questionData.options.length,
        timeLimit: questionData.timeLimit
      });

      setQuestionSent(true);
      setTimeLeft(currentQuestion.timeLimit || 30);
      setError(''); // Clear any previous errors
      
    } catch (err) {
      console.error('Failed to send first question:', err);
      setError(`Failed to send question: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleTimeUp = () => {
    setShowCorrectAnswer(true);
    setTimeLeft(0);
  };

  const handleNextQuestion = async () => {
    try {
      const nextIndex = currentQuestionIndex + 1;
      
      if (nextIndex >= questions.length) {
        // Quiz finished
        await viewerAPI.finishQuiz(quizId);
        setGameFinished(true);
        return;
      }

      // Send next question to viewers
      const nextQuestion = questions[nextIndex];
      const questionData = {
        question: nextQuestion.question,
        options: [nextQuestion.option1, nextQuestion.option2, nextQuestion.option3, nextQuestion.option4],
        correctAnswer: nextQuestion.correctAnswer,
        timeLimit: nextQuestion.timeLimit || 30
      };

      await viewerAPI.nextQuestion(quizId, nextQuestion.id, questionData);
      
      console.log(`➡️ Next question sent for quiz ${quizId}:`, {
        questionIndex: nextIndex + 1,
        questionId: nextQuestion.id,
        questionText: questionData.question,
        timeLimit: questionData.timeLimit
      });
      
      // Update local state
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(nextQuestion);
      setTimeLeft(nextQuestion.timeLimit || 30);
      setShowCorrectAnswer(false);
      setQuestionSent(true);
      
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        setError(`Failed to advance question: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    navigate('/');
  };

  const getAnswerColor = (index) => {
    const colors = ['#28a745', '#ffc107', '#dc3545', '#17a2b8']; // green, yellow, red, light blue
    return colors[index] || '#6c757d';
  };

  const getAnswerLetter = (index) => {
    return String.fromCharCode(65 + index); // A, B, C, D
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <h2>🎯 Loading Quiz...</h2>
          <p>Setting up the game...</p>
        </div>
      </div>
    );
  }

  if (gameFinished) {
    return (
      <div className="container">
        <div className="card">
          <h2>🏁 Quiz Finished!</h2>
          <h3>{quiz?.title}</h3>
          
          <div className="final-results" style={{ marginTop: '30px' }}>
            <h4>Final Leaderboard</h4>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
              {viewers
                .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
                .map((viewer, index) => (
                  <div key={index} style={{ 
                    padding: '10px', 
                    borderBottom: index < viewers.length - 1 ? '1px solid #ddd' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>
                      {index === 0 && '🥇'} 
                      {index === 1 && '🥈'} 
                      {index === 2 && '🥉'} 
                      {index > 2 && `${index + 1}.`} {viewer.name}
                    </span>
                    <strong>{viewer.totalScore || 0} points</strong>
                  </div>
                ))
              }
            </div>
          </div>

          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="container">
        <div className="card">
          <h2>❌ No Questions Available</h2>
          <p>This quiz doesn't have any questions yet.</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f2f5' }}>
      {/* Question Section (20% top) */}
      <div style={{ 
        height: '20%', 
        background: '#2c3e50', 
        color: 'white', 
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ width: '100%', maxWidth: '800px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: timeLeft <= 5 ? '#e74c3c' : '#2ecc71' }}>
              ⏰ {timeLeft}s
            </div>
            <div style={{ fontSize: '16px' }}>
              👥 {viewers.length} players
            </div>
          </div>
          
          <h2 style={{ fontSize: '28px', margin: '0', lineHeight: '1.3' }}>
            {currentQuestion?.question || 'Loading question...'}
          </h2>
        </div>
      </div>

      {/* Answers Section (80% bottom) */}
      <div style={{ 
        height: '80%', 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: '10px',
        padding: '10px'
      }}>
        {currentQuestion ? [currentQuestion.option1, currentQuestion.option2, currentQuestion.option3, currentQuestion.option4].map((option, index) => (
          <div
            key={index}
            style={{
              backgroundColor: getAnswerColor(index),
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '15px',
              fontSize: '24px',
              fontWeight: 'bold',
              textAlign: 'center',
              cursor: 'default',
              position: 'relative',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              border: showCorrectAnswer && option === currentQuestion.correctAnswer ? '5px solid #fff' : 'none'
            }}
          >
            <div style={{ 
              position: 'absolute',
              top: '15px',
              left: '15px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              {getAnswerLetter(index)}
            </div>
            
            <div style={{ marginTop: '20px', lineHeight: '1.2' }}>
              {option}
            </div>
            
            {showCorrectAnswer && option === currentQuestion.correctAnswer && (
              <div style={{ 
                position: 'absolute',
                top: '15px',
                right: '15px',
                fontSize: '30px'
              }}>
                ✅
              </div>
            )}
          </div>
        )) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666', fontSize: '24px' }}>
            Loading answers...
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'white',
        padding: '15px',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        minWidth: '200px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Game Controls</h4>
        
        {!questionSent ? (
          <button 
            onClick={handleStartFirstQuestion}
            className="btn btn-success btn-full"
            style={{ marginBottom: '10px' }}
          >
            🚀 Start First Question
          </button>
        ) : showCorrectAnswer ? (
          <button 
            onClick={handleNextQuestion}
            className="btn btn-primary btn-full"
            style={{ marginBottom: '10px' }}
          >
            {currentQuestionIndex + 1 >= questions.length ? '🏁 Finish Quiz' : '➡️ Next Question'}
          </button>
        ) : (
          <button 
            onClick={handleTimeUp}
            className="btn btn-warning btn-full"
            style={{ marginBottom: '10px' }}
          >
            ⏰ Show Answer
          </button>
        )}
        
        <div style={{ fontSize: '12px', color: '#666' }}>
          <div>Active Players: {viewers.length}</div>
          <div>Answers Received: {viewers.filter(v => v.currentAnswer).length}</div>
        </div>
      </div>

      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
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

export default QuizGameCreator;
