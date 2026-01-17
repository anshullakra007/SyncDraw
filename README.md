# 🎨 SyncDraw - Real-Time Collaborative Whiteboard

SyncDraw is a high-performance distributed system that enables multiple users to collaborate on a shared digital canvas in real-time. It leverages **WebSockets** for low-latency bidirectional communication and uses an optimistic concurrency model to handle rapid user inputs.

## 🚀 Tech Stack

* **Backend:** Java 21, Spring Boot, WebSocket API (STOMP Protocol).
* **Frontend:** React.js, Vite, HTML5 Canvas API.
* **Architecture:** Event-Driven Architecture with Pub/Sub messaging.

## ⚡ Key Features

* **Real-Time Synchronization:** Sub-millisecond latency for drawing events using persistent WebSocket connections.
* **Broadcast Architecture:** Scalable backend that routes drawing coordinates (`x`, `y`, `color`) to all subscribed clients instantly.
* **Optimized Rendering:** Uses HTML5 Canvas with efficient React state management to prevent re-render lags.

## 🛠️ How to Run Locally

### Prerequisites
* Java 21
* Node.js (v18+)

### 1. Start the Backend (Server)
```bash
cd backend
./gradlew bootRun