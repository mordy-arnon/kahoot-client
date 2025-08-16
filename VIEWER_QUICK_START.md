# Kahoot Viewer System - Quick Start Guide

This guide will help you quickly set up and test the complete Kahoot viewer system with both servers running.

## Overview

The system consists of:
1. **Main Server** (port 8080) - Quiz creation and management
2. **Viewer Server** (port 8081) - Real-time quiz participation
3. **React Client** (port 3000) - Web interface for both creators and viewers

## Quick Setup

### 1. Start the Main Server (port 8080)

```bash
cd builders
mvn spring-boot:run
```

Wait for the server to start. You should see: `Started Main on port 8080`

### 2. Start the Viewer Server (port 8081)

Open a new terminal:

```bash
cd viewers
mvn spring-boot:run
```

Wait for the server to start. You should see: `Started ViewerApplication on port 8081`

### 3. Start the React Client (port 3000)

Open a third terminal:

```bash
cd kahoot-client
npm start
```

The browser should open automatically to `http://localhost:3000`

## Testing the Complete Flow

### Step 1: Create a Quiz (Quiz Owner)

1. Go to `http://localhost:3000`
2. Sign up or login as a quiz creator
3. Create a new quiz with some questions
4. Note down the Quiz ID (you'll see it in the URL or dashboard)

### Step 2: Open Quiz for Viewers

The quiz owner needs to open the quiz for viewers. You can do this by calling the viewer API:

```bash
curl -X POST http://localhost:8081/api/viewer/quiz/{QUIZ_ID}/open \
  -H "Content-Type: application/json" \
  -d '{"title": "My Test Quiz"}'
```

Replace `{QUIZ_ID}` with your actual quiz ID.

### Step 3: Join as Viewer

1. Open a new browser window (or incognito mode)
2. Go to `http://localhost:3000`
3. Click "🎮 Join Quiz as Viewer"
4. Enter the Quiz ID and your name
5. Click "Join Quiz"
6. You should see the waiting room

### Step 4: Start the Quiz

Call the start quiz endpoint:

```bash
curl -X POST http://localhost:8081/api/viewer/quiz/{QUIZ_ID}/start
```

The viewer should automatically be redirected to the quiz play screen.

### Step 5: Send Questions

For each question, call:

```bash
curl -X POST http://localhost:8081/api/viewer/quiz/{QUIZ_ID}/question/{QUESTION_ID} \
  -H "Content-Type: application/json" \
  -d '{"timeLimit": 30, "question": "Sample question", "options": ["A", "B", "C", "D"]}'
```

### Step 6: Finish Quiz

```bash
curl -X POST http://localhost:8081/api/viewer/quiz/{QUIZ_ID}/finish
```

## Testing Multiple Viewers

1. Open multiple browser windows/tabs
2. Join the same quiz with different names
3. You'll see all participants in the waiting room
4. During the quiz, each viewer can submit answers independently

## API Testing with Postman/curl

### Check Quiz Status
```bash
curl -X POST http://localhost:8081/api/viewer/quiz/{QUIZ_ID}/status
```

### Get Viewers List
```bash
curl http://localhost:8081/api/viewer/quiz/{QUIZ_ID}/viewers
```

### Submit Answer (as viewer)
```bash
curl -X POST http://localhost:8081/api/viewer/quiz/{QUIZ_ID}/answer \
  -H "Content-Type: application/json" \
  -d '{
    "quizId": {QUIZ_ID},
    "questionId": {QUESTION_ID},
    "answer": "Paris",
    "submissionTime": 1640995200000
  }'
```

## WebSocket Testing

You can test WebSocket connections using browser developer tools:

```javascript
// Open browser console and run:
const socket = new SockJS('http://localhost:8081/ws');
const stompClient = Stomp.over(socket);

stompClient.connect({}, function (frame) {
    console.log('Connected: ' + frame);
    
    // Subscribe to quiz updates
    stompClient.subscribe('/topic/quiz/1/viewers', function (message) {
        console.log('Viewer update:', JSON.parse(message.body));
    });
    
    // Join quiz
    stompClient.send("/app/quiz/1/join", {}, JSON.stringify({
        sessionId: 'test-session',
        name: 'Test User'
    }));
});
```

## Troubleshooting

### Server Issues

1. **Port already in use**: Make sure no other services are running on ports 8080, 8081, or 3000
2. **Java version**: Ensure you're using Java 17 or higher
3. **Maven issues**: Run `mvn clean install` if you encounter dependency problems

### Client Issues

1. **CORS errors**: Make sure both servers are running and CORS is properly configured
2. **Connection refused**: Verify the server URLs in the React app match your running servers
3. **WebSocket issues**: Check browser console for WebSocket connection errors

### API Issues

1. **404 errors**: Verify the quiz ID exists and the endpoints are correct
2. **Quiz not found**: Make sure you've opened the quiz for viewers first
3. **Invalid quiz state**: Check that the quiz is in the correct state (WAITING, STARTED, etc.)

## Environment Variables

You can configure the client to use different server URLs:

```bash
# For the React client
REACT_APP_API_URL=http://localhost:8080
REACT_APP_VIEWER_API_URL=http://localhost:8081

npm start
```

## Production Deployment

For production deployment:

1. **Build the React app**:
   ```bash
   npm run build
   ```

2. **Package the Java servers**:
   ```bash
   mvn clean package
   ```

3. **Run with production profiles**:
   ```bash
   java -jar target/kahoot-builder-1.0.jar --spring.profiles.active=prod
   java -jar target/kahoot-viewer-1.0.jar --spring.profiles.active=prod
   ```

## Next Steps

- Add database persistence for viewer sessions
- Implement more sophisticated scoring algorithms
- Add quiz owner dashboard to monitor viewers in real-time
- Implement proper authentication for quiz owner operations
- Add more WebSocket events for richer real-time experience

## Support

If you encounter issues:
1. Check the console logs in both browser and server terminals
2. Verify all three services are running on their correct ports
3. Test API endpoints individually using curl or Postman
4. Check the README files for detailed configuration options 