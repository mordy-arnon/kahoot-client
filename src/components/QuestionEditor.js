import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { quizAPI } from '../services/api';

const QuestionEditor = () => {
  const [quiz, setQuiz] = useState(null);
  const [question, setQuestion] = useState({
    questionText: '',
    options: ['', '', '', ''], // Always ensure this is an array
    correctAnswerIndex: 0,
    points: 10,
    timeLimit: 30
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const params = useParams();
  const { quizId, questionId } = params;
  
  console.log('🔍 QuestionEditor render - Current state:', { 
    questionOptionsType: typeof question.options,
    questionOptionsIsArray: Array.isArray(question.options),
    questionOptionsLength: question.options?.length || 0,
    loading, 
    error,
    success
  });
  
  // Enhanced logic to detect new question creation
  const urlSuggestsNew = window.location.pathname.includes('/question/new') || 
                         window.location.pathname.endsWith('/question/new');
  const isNewQuestion = questionId === 'new' || !questionId || questionId === 'undefined' || urlSuggestsNew;
  const isEditing = !isNewQuestion;
  
  useEffect(() => {
    console.log('🔍 QuestionEditor mounted with params:', { 
      quizId, 
      questionId, 
      isNewQuestion, 
      isEditing,
      location: window.location.pathname,
      allParams: params
    });
    loadQuizAndQuestion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, questionId]);

  // Validate questionId early
  const isValidQuestionId = !questionId || questionId === 'new' || 
    (questionId && questionId !== 'undefined' && questionId !== 'null' && !isNaN(questionId));
    
  // Debug route matching
  console.log('🛣️ Route analysis:', {
    currentUrl: window.location.pathname,
    expectedPatterns: [
      '/quiz/:quizId/question/new',
      '/quiz/:quizId/question/:questionId/edit'
    ],
    extractedParams: { quizId, questionId },
    isNewQuestion,
    isEditing,
    isValidQuestionId
  });

  const loadQuizAndQuestion = async () => {
    try {
      setLoading(true);
      
      // Always load quiz info
      const quizResponse = await quizAPI.getQuiz(quizId);
      setQuiz(quizResponse.data);
      
      // Load question if editing
      if (isEditing) {
        console.log('🔄 Attempting to load question for editing:', { quizId, questionId, isEditing });
        
        if (!questionId || questionId === 'undefined' || questionId === 'null') {
          console.error('❌ Cannot load question - invalid questionId:', questionId);
          setError('Invalid question ID for editing');
          return;
        }
        
        try {
          const questionResponse = await quizAPI.getQuestion(quizId, questionId);
          const questionData = questionResponse.data;
          console.log('✅ Question loaded successfully:', questionData);
          
          setQuestion({
            questionText: questionData.questionText || '',
            options: Array.isArray(questionData.options) ? questionData.options : ['', '', '', ''],
            correctAnswerIndex: questionData.correctAnswerIndex || 0,
            points: questionData.points || 10,
            timeLimit: questionData.timeLimit || 30
          });
        } catch (err) {
          console.error('❌ Error loading question:', err);
          setError('Question not found');
        }
      } else {
        console.log('➕ Creating new question - no data to load');
      }
    } catch (err) {
      console.error('Error loading quiz:', err);
      setError('Quiz not found');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionChange = (e) => {
    setQuestion(prev => ({
      ...prev,
      questionText: e.target.value
    }));
  };

  const handleOptionChange = (index, value) => {
    console.log('📝 Option change:', { index, value, currentOptions: question.options });
    setQuestion(prev => ({
      ...prev,
      options: (prev.options || ['', '', '', '']).map((option, i) => i === index ? value : option)
    }));
  };

  const handleCorrectAnswerChange = (e) => {
    setQuestion(prev => ({
      ...prev,
      correctAnswerIndex: parseInt(e.target.value)
    }));
  };

  const handlePointsChange = (e) => {
    setQuestion(prev => ({
      ...prev,
      points: parseInt(e.target.value) || 10
    }));
  };

  const handleTimeLimitChange = (e) => {
    setQuestion(prev => ({
      ...prev,
      timeLimit: parseInt(e.target.value) || 30
    }));
  };

  const validateQuestion = () => {
    if (!question.questionText.trim()) {
      setError('Please enter a question');
      return false;
    }

    const safeOptions = question.options || ['', '', '', ''];
    const filledOptions = safeOptions.filter(option => option && option.trim());
    if (filledOptions.length < 2) {
      setError('Please provide at least 2 options');
      return false;
    }

    if (!safeOptions[question.correctAnswerIndex] || !safeOptions[question.correctAnswerIndex].trim()) {
      setError('The correct answer option cannot be empty');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateQuestion()) {
      return;
    }

    setLoading(true);

    try {
      const safeOptionsForSubmit = question.options || ['', '', '', ''];
      const questionData = {
        question: question.questionText.trim(),
        options: safeOptionsForSubmit.map(opt => (opt || '').trim()).filter(Boolean),
        correctAnswer: question.correctAnswerIndex,
        points: question.points,
        timeLimit: question.timeLimit
      };

      console.log('💾 QuestionEditor handleSubmit - About to save question:', {
        isNewQuestion,
        quizId,
        questionId,
        questionData
      });

      if (isNewQuestion) {
        console.log('➕ Creating new question');
        await quizAPI.createQuestion(quizId, questionData);
        setSuccess('Question created successfully!');
      } else {
        console.log('📝 Updating existing question');
        // Validate questionId before making API call
        if (!questionId || questionId === 'undefined' || questionId === 'null') {
          console.error('❌ Invalid questionId detected in QuestionEditor:', { questionId, quizId });
          setError('Invalid question ID. Please navigate back and try again.');
          return;
        }
        await quizAPI.createOrUpdateQuestion(quizId, questionId, questionData);
        setSuccess('Question updated successfully!');
      }

      // Redirect back to questions list after a short delay
      setTimeout(() => {
        navigate(`/quiz/${quizId}/questions`);
      }, 1500);

    } catch (err) {
      console.error('Error saving question:', err);
      setError(err.response?.data?.message || 'Failed to save question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    navigate('/');
  };

  if (!isValidQuestionId) {
    return (
      <div className="container">
        <div className="card">
          <div className="error">Invalid question ID: "{questionId}". Please navigate back and try again.</div>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading && !quiz) {
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
      <div className="card" style={{ maxWidth: '700px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 className="title" style={{ margin: 0, fontSize: '2rem' }}>
              {isNewQuestion ? '➕ New Question' : '✏️ Edit Question'}
            </h1>
            <p className="subtitle" style={{ margin: '5px 0 0 0' }}>
              Quiz: {quiz?.title}
            </p>
          </div>
          <div>
            <button 
              onClick={() => navigate(`/quiz/${quizId}/questions`)} 
              className="btn btn-secondary" 
              style={{ marginRight: '10px' }}
            >
              ← Questions
            </button>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="questionText">Question</label>
            <textarea
              id="questionText"
              value={question.questionText}
              onChange={handleQuestionChange}
              placeholder="Enter your question"
              required
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

          <div className="question-card">
            <h3>Answer Options</h3>
            {(question.options || ['', '', '', '']).map((option, index) => (
              <div key={index} className="option">
                <div className="option-label">Option {String.fromCharCode(65 + index)}:</div>
                <input
                  type="text"
                  value={option || ''}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Enter option ${String.fromCharCode(65 + index)}`}
                />
              </div>
            ))}

            <div className="correct-answer">
              <label htmlFor="correctAnswer">Correct Answer:</label>
              <select
                id="correctAnswer"
                value={question.correctAnswerIndex}
                onChange={handleCorrectAnswerChange}
              >
                {(question.options || ['', '', '', '']).map((option, index) => (
                  <option key={index} value={index} disabled={!(option && option.trim())}>
                    Option {String.fromCharCode(65 + index)}{(option && option.trim()) ? `: ${option}` : ' (empty)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label htmlFor="points">Points</label>
              <input
                type="number"
                id="points"
                value={question.points}
                onChange={handlePointsChange}
                min="1"
                max="100"
                placeholder="10"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="timeLimit">Time Limit (seconds)</label>
              <input
                type="number"
                id="timeLimit"
                value={question.timeLimit}
                onChange={handleTimeLimitChange}
                min="5"
                max="300"
                placeholder="30"
              />
            </div>
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Saving...' : (isNewQuestion ? 'Create Question' : 'Update Question')}
            </button>
            
            <button
              type="button"
              onClick={() => navigate(`/quiz/${quizId}/questions`)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionEditor; 