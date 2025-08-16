import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './components/HomePage';
import Dashboard from './components/Dashboard';
import QuestionsList from './components/QuestionsList';
import QuestionEditor from './components/QuestionEditor';
import ViewerJoin from './components/ViewerJoin';
import ViewerWaiting from './components/ViewerWaiting';
import ViewerPlay from './components/ViewerPlay';
import './App.css';

function App() {
  const isAuthenticated = () => {
    const jwt = localStorage.getItem('jwt');
    console.log('Checking authentication, JWT token:', jwt);
    return jwt !== null;
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route 
            path="/dashboard" 
            element={isAuthenticated() ? <Dashboard /> : <Navigate to="/" />} 
          />

          <Route 
            path="/quiz/:quizId/questions" 
            element={isAuthenticated() ? <QuestionsList /> : <Navigate to="/" />} 
          />
          <Route 
            path="/quiz/:quizId/question/new" 
            element={isAuthenticated() ? <QuestionEditor /> : <Navigate to="/" />} 
          />
          <Route 
            path="/quiz/:quizId/question/:questionId/edit" 
            element={isAuthenticated() ? <QuestionEditor /> : <Navigate to="/" />} 
          />

          {/* Viewer routes - no authentication required */}
          <Route path="/quiz/:quizId/join" element={<ViewerJoin />} />
          <Route path="/quiz/:quizId/waiting" element={<ViewerWaiting />} />
          <Route path="/quiz/:quizId/play" element={<ViewerPlay />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 