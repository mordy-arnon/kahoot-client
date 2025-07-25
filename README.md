# Kahoot Client

A React-based web application for creating quiz questions similar to Kahoot.

## Features

- **User Authentication**: Sign up and login with JWT token authentication
- **Question Creation**: Create multiple choice questions with 4 options
- **Progress Tracking**: Visual progress bar during question creation
- **Modern UI**: Clean, responsive design with gradient backgrounds

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory:
   ```
   REACT_APP_API_URL=http://localhost:3001
   ```

3. **Start the Application**
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`.

## API Endpoints

The application expects the following API endpoints:

### Authentication
- `POST /signup` - User registration
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com", 
    "password": "password123"
  }
  ```

- `POST /login` - User login
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
  Returns: `{ "token": "jwt_token_here" }`

### Game Management
- `POST /game` - Create a new game
  Returns: `{ "gameId": "unique_game_id" }`

- `POST /game/{gameId}/question/{questionId}` - Create a question
  ```json
  {
    "question": "What is the capital of France?",
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "correctAnswer": 2
  }
  ```

## Usage Flow

1. **Homepage**: Users can sign up or login
2. **Dashboard**: After authentication, users can create and manage quizzes
3. **Quiz Management**: Create new quizzes, view existing ones, and manage questions
4. **Question Creation**: Add questions to quizzes with full CRUD operations
5. **Database Storage**: All quizzes and questions are persisted in the database

## Technology Stack

- React 18
- React Router 6
- Axios for HTTP requests  
- Local Storage for JWT token management
- CSS3 with modern styling

## Development

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests 