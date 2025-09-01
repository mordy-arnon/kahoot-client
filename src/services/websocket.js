import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscriptions = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
  }

  connect(viewerApiUrl = process.env.REACT_APP_VIEWER_API_URL || 'http://localhost:8081') {
    if (this.connected) {
      console.log('🔌 WebSocket already connected');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Create SockJS connection
        const socket = new SockJS(`${viewerApiUrl}/ws`);
        
        // Create STOMP client
        this.client = new Client({
          webSocketFactory: () => socket,
          debug: (str) => {
            console.log('🔌 STOMP Debug:', str);
          },
          reconnectDelay: this.reconnectDelay,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
        });

        // Connection callbacks
        this.client.onConnect = (frame) => {
          console.log('✅ WebSocket connected:', frame);
          this.connected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.client.onStompError = (frame) => {
          console.error('❌ WebSocket STOMP error:', frame);
          this.connected = false;
          reject(new Error(`STOMP error: ${frame.headers['message']}`));
        };

        this.client.onWebSocketClose = (event) => {
          console.log('🔌 WebSocket connection closed:', event);
          this.connected = false;
          this.handleReconnect();
        };

        this.client.onWebSocketError = (event) => {
          console.error('❌ WebSocket error:', event);
          this.connected = false;
        };

        // Activate the client
        this.client.activate();

      } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.client) {
      console.log('🔌 Disconnecting WebSocket...');
      this.subscriptions.clear();
      this.client.deactivate();
      this.connected = false;
    }
  }

  // Subscribe to quiz status updates
  subscribeToQuizStatus(quizId, callback) {
    const destination = `/topic/quiz/${quizId}/status`;
    return this.subscribe(destination, callback);
  }

  // Subscribe to quiz updates (new questions, results, etc.)
  subscribeToQuizUpdates(quizId, callback) {
    const destination = `/topic/quiz/${quizId}/updates`;
    return this.subscribe(destination, callback);
  }

  // Subscribe to new questions
  subscribeToQuestions(quizId, callback) {
    const destination = `/topic/quiz/${quizId}/question`;
    return this.subscribe(destination, callback);
  }

  // Subscribe to quiz results
  subscribeToResults(quizId, callback) {
    const destination = `/topic/quiz/${quizId}/results`;
    return this.subscribe(destination, callback);
  }

  // Subscribe to viewers list updates
  subscribeToViewers(quizId, callback) {
    const destination = `/topic/quiz/${quizId}/viewers`;
    return this.subscribe(destination, callback);
  }

  // Subscribe to personal viewer updates
  subscribeToPersonalUpdates(quizId, sessionId, callback) {
    const destination = `/queue/quiz/${quizId}/viewer/${sessionId}`;
    return this.subscribe(destination, callback);
  }

  // Generic subscribe method
  subscribe(destination, callback) {
    if (!this.connected || !this.client) {
      console.error('❌ Cannot subscribe: WebSocket not connected');
      return null;
    }

    console.log(`📡 Subscribing to: ${destination}`);
    
    const subscription = this.client.subscribe(destination, (message) => {
      try {
        const data = JSON.parse(message.body);
        console.log(`📨 Received message from ${destination}:`, data);
        callback(data);
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    });

    this.subscriptions.set(destination, subscription);
    return subscription;
  }

  // Unsubscribe from a destination
  unsubscribe(destination) {
    const subscription = this.subscriptions.get(destination);
    if (subscription) {
      console.log(`📡 Unsubscribing from: ${destination}`);
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
    }
  }

  // Send a message
  send(destination, body = {}) {
    if (!this.connected || !this.client) {
      console.error('❌ Cannot send message: WebSocket not connected');
      return;
    }

    console.log(`📤 Sending message to ${destination}:`, body);
    this.client.publish({
      destination,
      body: JSON.stringify(body)
    });
  }

  // Join a quiz via WebSocket
  joinQuiz(quizId, sessionId, name) {
    this.send(`/app/quiz/${quizId}/join`, {
      sessionId,
      name
    });
  }

  // Submit answer via WebSocket
  submitAnswer(quizId, answerData) {
    this.send(`/app/quiz/${quizId}/answer`, answerData);
  }

  // Get connection status
  isConnected() {
    return this.connected;
  }

  // Get quiz status via WebSocket subscription
  getQuizStatus(quizId) {
    if (!this.connected || !this.client) {
      console.error('❌ Cannot get quiz status: WebSocket not connected');
      return;
    }

    // Subscribe to get initial status
    this.client.subscribe(`/app/quiz/${quizId}/status`, (message) => {
      const data = JSON.parse(message.body);
      console.log(`📊 Quiz ${quizId} status:`, data);
    });
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;
