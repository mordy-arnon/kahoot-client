import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include JWT token and logging
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log all API requests for debugging
    console.log(`🚀 API Request [${config.method?.toUpperCase()}]:`, {
      url: config.url,
      baseURL: config.baseURL,
      fullUrl: `${config.baseURL}${config.url}`,
      data: config.data,
      params: config.params
    });
    
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response [${response.config.method?.toUpperCase()}]:`, {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error(`❌ API Response Error [${error.config?.method?.toUpperCase()}]:`, {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      fullError: error.response?.data
    });
    return Promise.reject(error);
  }
);

// API functions
export const authAPI = {
  signup: (userData) => api.post('/api/auth/signup', userData),
  login: (credentials) => api.post('/api/auth/login', credentials),
};

export const quizAPI = {
  // Quiz operations
  getAllQuizzes: (ownerId) => {
    console.log('📋 quizAPI.getAllQuizzes() called with ownerId', ownerId);
    return api.get(`/api/quiz?owner=${ownerId}`);
  },
  getQuiz: (quizId) => {
    console.log('📄 quizAPI.getQuiz() called with:', { quizId });
    return api.get(`/api/quiz/${quizId}`);
  },
  createQuiz: (quizData) => {
    console.log('➕ quizAPI.createQuiz() called with:', { quizData });
    return api.post('/api/quiz', quizData);
  },
  updateQuiz: (quizId, quizData) => {
    console.log('📝 quizAPI.updateQuiz() called with:', { quizId, quizData });
    return api.post(`/api/quiz/${quizId}`, quizData);
  },
  
  // Question operations
  getQuestions: (quizId) => {
    console.log('❓ quizAPI.getQuestions() called with:', { quizId });
    return api.get(`/api/quiz/${quizId}/question`);
  },
  getQuestion: (quizId, questionId) => {
    console.log('❓ quizAPI.getQuestion() called with:', { quizId, questionId });
    return api.get(`/api/quiz/${quizId}/question/${questionId}`);
  },
  createQuestion: (quizId, questionData) => {
    console.log('➕ quizAPI.createQuestion() called with:', { quizId, questionData });
    return api.post(`/api/quiz/${quizId}/question`, questionData);
  },
  createOrUpdateQuestion: (quizId, questionId, questionData) => {
    console.log('💾 quizAPI.createOrUpdateQuestion() called with:', { quizId, questionId, questionData });
    
    // Validate parameters before making request
    if (!quizId || quizId === 'undefined' || quizId === 'null') {
      console.error('❌ Invalid quizId in createOrUpdateQuestion:', quizId);
      return Promise.reject(new Error(`Invalid quizId: ${quizId}`));
    }
    if (!questionId || questionId === 'undefined' || questionId === 'null') {
      console.error('❌ Invalid questionId in createOrUpdateQuestion:', questionId);
      return Promise.reject(new Error(`Invalid questionId: ${questionId}`));
    }
    
    return api.post(`/api/quiz/${quizId}/question/${questionId}`, questionData);
  },
};

// Legacy API - Deprecated: Use quizAPI directly instead
// Keeping for any remaining references, but recommend migration to quizAPI
export const gameAPI = {
  createGame: () => {
    console.warn('⚠️ gameAPI.createGame() is deprecated. Use quizAPI.createQuiz() instead.');
    return quizAPI.createQuiz({ title: 'New Quiz', description: 'Created from legacy API' });
  },
  createQuestion: (gameId, questionId, questionData) => {
    console.warn('⚠️ gameAPI.createQuestion() is deprecated. Use quizAPI.createQuestion() instead.');
    
    // Validate parameters
    if (!gameId || gameId === 'undefined' || gameId === 'null') {
      console.error('❌ Invalid gameId in legacy createQuestion:', gameId);
      return Promise.reject(new Error(`Invalid gameId: ${gameId}`));
    }
    
    return quizAPI.createQuestion(gameId, questionData);
  },
};

export default api; 