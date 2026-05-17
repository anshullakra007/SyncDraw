# 🎨 SyncDraw - Real-time Collaborative Whiteboard

![React](https://img.shields.io/badge/React-18-blue)
![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-black)
![Node.js](https://img.shields.io/badge/Node.js-Backend-green)
![Express](https://img.shields.io/badge/Express-Server-lightgrey)
![Live](https://img.shields.io/badge/Status-Live_Deployed-success)

**SyncDraw** is a high-performance collaborative whiteboard that enables multiple users to draw, brainstorm, and ideate on a shared infinite canvas in real-time. Built to demonstrate low-latency WebSocket communication, it ensures that every stroke made by one user is instantly broadcast to all other connected clients.

🚀 **Live Demo:** [Click Here to Open App](https://sync-draw-eight.vercel.app/)

---

## 🌟 Key Features

* **⚡ Zero-Latency Collaboration:** Uses **Socket.io** to broadcast drawing events (coordinates, color, stroke width) instantly to all users in the room.
* **🖌️ Rich Drawing Tools:** Includes a customizable pen tool with adjustable colors and brush sizes, plus an eraser and clear-canvas option.
* **🌍 Infinite Canvas:** Use middle-click or `Alt + Drag` to pan, and scroll to zoom in and out of an endless world coordinate system.
* **🔒 Google Authentication:** WebSocket connections are securely authenticated at the handshake layer using Google OAuth 2.0 JWT tokens.
* **👥 Multi-User Support:** Handles multiple concurrent connections without lag, managing state on the server side.
* **📱 Responsive Canvas:** The HTML5 Canvas automatically resizes to fit any screen, from desktops to tablets.

---

## 🏗️ Architecture & Tech Stack

This project uses a **Bi-Directional Communication** architecture:

### **Frontend (Client)**
* **React.js:** Manages the UI state and tool selection.
* **HTML5 Canvas API:** Handles the raw pixel rendering for high-performance drawing.
* **Socket.io Client:** Listens for incoming drawing data and emits local user actions.

### **Backend (Server)**
* **Node.js & Express:** Serves the application and handles HTTP requests.
* **Socket.io Server:** Acts as the central hub (Signaling Server) that receives drawing packets and broadcasts them to all other connected clients.

---

## 🛠️ System Design (How it Works)

1.  **Connection:** When a user joins, a WebSocket handshake is established between the Client and Server.
2.  **Emission:** When User A draws, the client captures the mouse coordinates `(x, y)` and emits a `draw` event to the server.
3.  **Broadcasting:** The server receives the event and immediately broadcasts it to **User B, User C, etc.** (excluding User A).
4.  **Rendering:** The receiving clients use the Canvas API to draw a line connecting the new coordinates, creating a seamless stroke.

---

## 🚀 Running Locally

### Prerequisites
* Node.js (v16 or higher)
* npm (Node Package Manager)

### 1. Clone the Repository
```bash
git clone https://github.com/anshullakra007/syncdraw.git
cd syncdraw
```

### 2. Set up the Backend
The backend requires a Google Client ID to securely authenticate WebSocket connections.
1. Create a `.env` file in the `backend` directory:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id_here
   ```
2. Install dependencies and start the server:
   ```bash
   cd backend
   npm install
   npm start
   ```

### 3. Set up the Client
1. Create a `.env` file in the `client` directory:
   ```env
   VITE_WS_URL=http://localhost:8080
   VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
   ```
2. Install dependencies and start the React app:
   ```bash
   cd ../client
   npm install
   npm run dev
   ```
