import axios from 'axios';

// Create axios instances with base configuration
const authApi = axios.create({
  baseURL: process.env.REACT_APP_AUTH_API_URL || 'http://localhost:8079',
  headers: {
    'Content-Type': 'application/json',
  },
});

const builderApi = axios.create({
  baseURL: process.env.REACT_APP_BUILDER_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create viewer API instance for port 8081
const viewerApi = axios.create({
  baseURL: process.env.REACT_APP_VIEWER_API_URL || 'http://localhost:8081',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include JWT token and logging for builder API
builderApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log all API requests for debugging
    console.log(`🚀 Builder API Request [${config.method?.toUpperCase()}]:`, {
      url: config.url,
      baseURL: config.baseURL,
      fullUrl: `${config.baseURL}${config.url}`,
      data: config.data,
      params: config.params
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Builder API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add viewer API request interceptor
viewerApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log all viewer API requests for debugging
    console.log(`🎮 Viewer API Request [${config.method?.toUpperCase()}]:`, {
      url: config.url,
      baseURL: config.baseURL,
      fullUrl: `${config.baseURL}${config.url}`,
      data: config.data,
      params: config.params
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Viewer API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
builderApi.interceptors.response.use(
  (response) => {
    console.log(`✅ Builder API Response [${response.config.method?.toUpperCase()}]:`, {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error(`❌ Builder API Response Error [${error.config?.method?.toUpperCase()}]:`, {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      fullError: error.response?.data
    });
    return Promise.reject(error);
  }
);

// Add viewer API response interceptor
viewerApi.interceptors.response.use(
  (response) => {
    console.log(`✅ Viewer API Response [${response.config.method?.toUpperCase()}]:`, {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error(`❌ Viewer API Response Error [${error.config?.method?.toUpperCase()}]:`, {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      fullError: error.response?.data
    });
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  signup: (userData) => authApi.post('/api/auth/signup', userData),
  login: (credentials) => authApi.post('/api/auth/login', credentials),
  validateToken: () => {
    const token = localStorage.getItem('jwt');
    if (!token) return Promise.reject('No token found');
    return authApi.post('/api/auth/validate', null, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};

// Quiz API functions
export const quizAPI = {
  // Quiz operations
  getAllQuizzes: () => {
    console.log('📋 quizAPI.getAllQuizzes() called');
    return builderApi.get('/api/quiz');
  },
  getQuiz: (quizId) => {
    console.log('📄 quizAPI.getQuiz() called with:', { quizId });
    return builderApi.get(`/api/quiz/${quizId}`);
  },
  createQuiz: (quizData) => {
    console.log('➕ quizAPI.createQuiz() called with:', { quizData });
    return builderApi.post('/api/quiz', quizData);
  },
  updateQuiz: (quizId, quizData) => {
    console.log('📝 quizAPI.updateQuiz() called with:', { quizId, quizData });
    return builderApi.post(`/api/quiz/${quizId}`, quizData);
  },
  
  // Question operations
  getQuestions: (quizId) => {
    console.log('❓ quizAPI.getQuestions() called with:', { quizId });
    return builderApi.get(`/api/quiz/${quizId}/question`);
  },
  getQuestion: (quizId, questionId) => {
    console.log('❓ quizAPI.getQuestion() called with:', { quizId, questionId });
    return builderApi.get(`/api/quiz/${quizId}/question/${questionId}`);
  },
  createQuestion: (quizId, questionData) => {
    console.log('➕ quizAPI.createQuestion() called with:', { quizId, questionData });
    return builderApi.post(`/api/quiz/${quizId}/question`, questionData);
  },
  createOrUpdateQuestion: (quizId, questionId, questionData) => {
    console.log('💾 quizAPI.createOrUpdateQuestion() called with:', { quizId, questionId, questionData });
    return builderApi.post(`/api/quiz/${quizId}/question/${questionId}`, questionData);
  },
};

// Viewer API functions for quiz participation
export const viewerAPI = {
  // Check if quiz is open for viewers
  checkQuizStatus: (quizId) => {
    console.log('🎮 viewerAPI.checkQuizStatus() called with:', { quizId });
    return viewerApi.post(`/api/viewer/quiz/${quizId}/status`);
  },
  
  // Join a quiz as viewer
  joinQuiz: (quizId, viewerData) => {
    console.log('🎮 viewerAPI.joinQuiz() called with:', { quizId, viewerData });
    return viewerApi.post(`/api/viewer/quiz/${quizId}/join`, viewerData);
  },
  
  // Get list of viewers in a quiz
  getViewers: (quizId) => {
    console.log('🎮 viewerAPI.getViewers() called with:', { quizId });
    return viewerApi.get(`/api/viewer/quiz/${quizId}/viewers`);
  },
  
  // Submit an answer as viewer
  submitAnswer: (quizId, answerData) => {
    console.log('🎮 viewerAPI.submitAnswer() called with:', { quizId, answerData });
    return viewerApi.post(`/api/viewer/quiz/${quizId}/answer`, answerData);
  },
  
  // Quiz owner endpoints (called from main server)
  openQuiz: (quizId, quizData) => {
    console.log('🎮 viewerAPI.openQuiz() called with:', { quizId, quizData });
    return viewerApi.post(`/api/viewer/quiz/${quizId}/open`, quizData);
  },
  
  startQuiz: (quizId) => {
    console.log('🎮 viewerAPI.startQuiz() called with:', { quizId });
    return viewerApi.post(`/api/viewer/quiz/${quizId}/start`);
  },
  
  nextQuestion: (quizId, questionId, questionData) => {
    console.log('🎮 viewerAPI.nextQuestion() called with:', { quizId, questionId, questionData });
    return viewerApi.post(`/api/viewer/quiz/${quizId}/question/${questionId}`, questionData);
  },
  
  finishQuiz: (quizId) => {
    console.log('🎮 viewerAPI.finishQuiz() called with:', { quizId });
    return viewerApi.post(`/api/viewer/quiz/${quizId}/finish`);
  }
};

export default builderApi; 