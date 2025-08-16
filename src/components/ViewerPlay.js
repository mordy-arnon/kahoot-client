import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { viewerAPI } from '../services/api';

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

    // Start polling for quiz updates
    const pollInterval = setInterval(() => {
      checkForUpdates();
    }, 1000); // Poll every second

    checkForUpdates();

    return () => clearInterval(pollInterval);
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

  const checkForUpdates = async () => {
    try {
      const response = await viewerAPI.checkQuizStatus(quizId);
      const status = response.data;
      
      console.log('Quiz status update:', status);
      
      if (status.isFinished) {
        setQuizFinished(true);
      } else if (status.currentQuestion && status.currentQuestion !== currentQuestion?.id) {
        // New question available
        fetchCurrentQuestion(status.currentQuestion);
      } else if (status.isStarted && !currentQuestion) {
        // Quiz started but no question yet, wait for first question
        setError('Waiting for the first question...');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error checking for updates:', err);
      setError('Connection lost. Trying to reconnect...');
    }
  };

  const fetchCurrentQuestion = async () => {
    try {
      // In a real implementation, you'd fetch the current question from the viewer API
      // For now, we'll simulate a question structure
      const mockQuestion = {
        id: Date.now(),
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: "Paris",
        timeLimit: 30,
        points: 1000
      };
      
      setCurrentQuestion(mockQuestion);
      setTimeLeft(mockQuestion.timeLimit);
      setSubmitted(false);
      setSelectedAnswer('');
      setQuestionNumber(prev => prev + 1);
      
    } catch (err) {
      console.error('Error fetching question:', err);
      setError('Failed to load question.');
    }
  };

  const handleAnswerSelect = (answer) => {
    if (!submitted) {
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

      // Calculate score (simplified)
      if (selectedAnswer === currentQuestion.correctAnswer) {
        const speedBonus = Math.max(100, Math.floor((timeLeft / currentQuestion.timeLimit) * 1000));
        setScore(prev => prev + speedBonus);
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

  return (
    <div className="container">
      <div className="card">
        <div className="quiz-header">
          <div className="quiz-info">
            <span>Question {questionNumber}</span>
            <span className="score">Score: {score}</span>
          </div>
          
          <div className="timer">
            <div className={`time-left ${timeLeft <= 5 ? 'urgent' : ''}`}>
              ⏰ {timeLeft}s
            </div>
          </div>
        </div>

        <div className="question-section">
          <h2>{currentQuestion.question}</h2>
          
          <div className="answers-grid">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                className={`answer-option ${selectedAnswer === option ? 'selected' : ''} ${submitted ? 'disabled' : ''}`}
                onClick={() => handleAnswerSelect(option)}
                disabled={submitted}
              >
                <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                <span className="option-text">{option}</span>
              </button>
            ))}
          </div>

          {selectedAnswer && !submitted && (
            <button
              onClick={handleSubmitAnswer}
              className="btn btn-primary btn-full"
              style={{ marginTop: '20px' }}
            >
              Submit Answer
            </button>
          )}

          {submitted && (
            <div className="submitted-message">
              <p>✅ Answer submitted! Waiting for next question...</p>
              {selectedAnswer === currentQuestion.correctAnswer ? (
                <p className="correct">🎉 Correct! +{Math.max(100, Math.floor((timeLeft / currentQuestion.timeLimit) * 1000))} points</p>
              ) : (
                <p className="incorrect">❌ Incorrect. The correct answer was: {currentQuestion.correctAnswer}</p>
              )}
            </div>
          )}
        </div>

        {error && <div className="error">{error}</div>}
      </div>

      <style jsx>{`
        .quiz-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 15px;
          background: #f0f8ff;
          border-radius: 8px;
        }
        
        .quiz-info {
          display: flex;
          gap: 20px;
          font-weight: bold;
        }
        
        .score {
          color: #007bff;
        }
        
        .timer .time-left {
          font-size: 1.5em;
          font-weight: bold;
          color: #28a745;
        }
        
        .timer .time-left.urgent {
          color: #dc3545;
          animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        .question-section h2 {
          font-size: 1.5em;
          margin-bottom: 25px;
          text-align: center;
        }
        
        .answers-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .answer-option {
          display: flex;
          align-items: center;
          padding: 15px;
          border: 2px solid #ddd;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
        }
        
        .answer-option:hover:not(.disabled) {
          border-color: #007bff;
          background: #f8f9fa;
        }
        
        .answer-option.selected {
          border-color: #007bff;
          background: #e3f2fd;
        }
        
        .answer-option.disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        
        .option-letter {
          font-weight: bold;
          background: #007bff;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
          flex-shrink: 0;
        }
        
        .answer-option.selected .option-letter {
          background: #28a745;
        }
        
        .option-text {
          flex: 1;
        }
        
        .submitted-message {
          text-align: center;
          padding: 20px;
          border-radius: 8px;
          background: #f8f9fa;
        }
        
        .submitted-message .correct {
          color: #28a745;
          font-weight: bold;
        }
        
        .submitted-message .incorrect {
          color: #dc3545;
          font-weight: bold;
        }
        
        .final-score {
          text-align: center;
          margin: 30px 0;
        }
        
        .score-display {
          font-size: 3em;
          font-weight: bold;
          color: #007bff;
          margin: 20px 0;
        }
        
        .quiz-summary {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .current-score {
          text-align: center;
          font-size: 1.2em;
          color: #007bff;
          margin: 20px 0;
        }
      `}</style>
    </div>
  );
};

export default ViewerPlay; 