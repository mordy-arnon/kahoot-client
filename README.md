# Kahoot Clone Client

This is the frontend client for the Kahoot Clone project.

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
REACT_APP_AUTH_API_URL=http://localhost:8079
REACT_APP_BUILDER_API_URL=http://localhost:8080
REACT_APP_VIEWER_API_URL=http://localhost:8081
```

These variables configure the client to connect to:
- Auth Server (port 8079) - Handles user authentication
- Builder Server (port 8080) - Manages quiz creation and editing
- Viewer Server (port 8081) - Manages quiz participation

## Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Architecture

The application is split into three main services:

1. **Auth Server** (port 8079)
   - User registration and login
   - JWT token generation and validation
   - User profile management

2. **Builder Server** (port 8080)
   - Quiz creation and editing
   - Question management
   - Quiz settings and configuration

3. **Viewer Server** (port 8081)
   - Quiz participation
   - Real-time quiz state management
   - Viewer session handling
   - Answer submission and scoring

## Authentication Flow

1. User logs in via Auth Server
2. Auth Server returns JWT token
3. Client stores token in localStorage
4. Token is included in all requests to Builder and Viewer servers
5. Resource servers validate token before processing requests

## API Structure

### Auth API (`authAPI`)
- `signup(userData)` - Register new user
- `login(credentials)` - Login user
- `validateToken()` - Validate current JWT token

### Quiz API (`quizAPI`)
- `getAllQuizzes()` - Get user's quizzes
- `getQuiz(quizId)` - Get specific quiz
- `createQuiz(quizData)` - Create new quiz
- `updateQuiz(quizId, quizData)` - Update quiz
- `getQuestions(quizId)` - Get quiz questions
- `createQuestion(quizId, questionData)` - Add question
- `createOrUpdateQuestion(quizId, questionId, questionData)` - Update question

### Viewer API (`viewerAPI`)
- `checkQuizStatus(quizId)` - Check if quiz is open
- `joinQuiz(quizId, viewerData)` - Join quiz as viewer
- `getViewers(quizId)` - Get quiz participants
- `submitAnswer(quizId, answerData)` - Submit answer
- `openQuiz(quizId, quizData)` - Open quiz for joining
- `startQuiz(quizId)` - Start quiz
- `nextQuestion(quizId, questionId, questionData)` - Show next question
- `finishQuiz(quizId)` - End quiz 