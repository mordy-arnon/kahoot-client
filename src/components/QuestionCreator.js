import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameAPI } from '../services/api';

const QuestionCreator = () => {
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameId, setGameId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const count = localStorage.getItem('questionCount');
    if (!count) {
      navigate('/dashboard');
      return;
    }
    setTotalQuestions(parseInt(count));
    
    // Create a new game when component mounts
    createGame();
  }, [navigate]);

  const createGame = async () => {
    try {
      const response = await gameAPI.createGame();
      console.log('Game created:', response.data);
      setGameId(response.data.id || response.data.gameId || Date.now().toString());
    } catch (err) {
      setError('Failed to create game. Please try again.');
      console.error('Game creation error:', err);
    }
  };

  const handleQuestionChange = (e) => {
    setCurrentQuestion(prev => ({
      ...prev,
      question: e.target.value
    }));
  };

  const handleOptionChange = (index, value) => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: prev.options.map((option, i) => i === index ? value : option)
    }));
  };

  const handleCorrectAnswerChange = (e) => {
    setCurrentQuestion(prev => ({
      ...prev,
      correctAnswer: parseInt(e.target.value)
    }));
  };

  const validateQuestion = () => {
    if (!currentQuestion.question.trim()) {
      setError('Please enter a question');
      return false;
    }

    const filledOptions = currentQuestion.options.filter(option => option.trim());
    if (filledOptions.length < 2) {
      setError('Please provide at least 2 options');
      return false;
    }

    if (!currentQuestion.options[currentQuestion.correctAnswer].trim()) {
      setError('The correct answer option cannot be empty');
      return false;
    }

    return true;
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateQuestion()) {
      return;
    }

    setLoading(true);

    try {
      if (!gameId) {
        setError('Game not created yet. Please wait or refresh the page.');
        return;
      }

      const questionId = (currentQuestionIndex || 0) + 1;
      const questionData = {
        question: currentQuestion.question.trim(),
        options: currentQuestion.options.map(opt => opt.trim()).filter(Boolean),
        correctAnswer: currentQuestion.correctAnswer
      };

      console.log('Submitting question:', { gameId, questionId, questionData });
      await gameAPI.createQuestion(gameId, questionId, questionData);

      // Store the question locally
      const newQuestions = [...questions, { ...questionData, id: questionId }];
      setQuestions(newQuestions);

      setSuccess(`Question ${questionId} saved successfully!`);

      // Move to next question or finish
      if (currentQuestionIndex + 1 < totalQuestions) {
        setTimeout(() => {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setCurrentQuestion({
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 0
          });
          setSuccess('');
        }, 1500);
      } else {
        // All questions completed
        setTimeout(() => {
          localStorage.removeItem('questionCount');
          alert('All questions created successfully! Quiz is ready.');
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('questionCount');
    navigate('/');
  };

  const progressPercentage = ((currentQuestionIndex) / totalQuestions) * 100;

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '700px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 className="title" style={{ margin: 0, fontSize: '2rem' }}>
            ✏️ Question Creator
          </h1>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>

        <div className="question-counter">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </div>

        <div className="progress">
          <div 
            className="progress-bar" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        <form onSubmit={handleSubmitQuestion}>
          <div className="form-group">
            <label htmlFor="question">Question</label>
            <input
              type="text"
              id="question"
              value={currentQuestion.question}
              onChange={handleQuestionChange}
              placeholder="Enter your question"
              required
            />
          </div>

          <div className="question-card">
            <h3>Answer Options</h3>
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="option">
                <div className="option-label">Option {String.fromCharCode(65 + index)}:</div>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Enter option ${String.fromCharCode(65 + index)}`}
                />
              </div>
            ))}

            <div className="correct-answer">
              <label htmlFor="correctAnswer">Correct Answer:</label>
              <select
                id="correctAnswer"
                value={currentQuestion.correctAnswer}
                onChange={handleCorrectAnswerChange}
              >
                {currentQuestion.options.map((option, index) => (
                  <option key={index} value={index} disabled={!option.trim()}>
                    Option {String.fromCharCode(65 + index)}{option.trim() ? `: ${option}` : ' (empty)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Saving...' : 
             currentQuestionIndex + 1 === totalQuestions ? 'Save Final Question' : 'Save & Next Question'}
          </button>
        </form>

        {questions.length > 0 && (
          <div style={{ marginTop: '30px', padding: '20px', background: '#f0fff4', borderRadius: '10px', border: '1px solid #c6f6d5' }}>
            <h3 style={{ color: '#2d3748', marginBottom: '15px' }}>✅ Questions Created: {questions.length}</h3>
            <ul style={{ color: '#4a5568', lineHeight: '1.6' }}>
              {questions.map((q, index) => (
                <li key={q.id}>Question {index + 1}: {q.question.substring(0, 50)}...</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionCreator; 