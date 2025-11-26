# 💖 Sync Hearts: A Real-Time Cooperative Game

![Status](https://img.shields.io/badge/Status-Live-success)
![Tech](https://img.shields.io/badge/Stack-MERN-blue)
![RealTime](https://img.shields.io/badge/Socket.io-Powered-orange)

**Sync Hearts** is a real-time, asymmetric cooperative web game designed to test communication and trust between two players. Built from scratch using **WebSockets** and **Procedural Generation algorithms**.

🔗 **[PLAY THE LIVE DEMO HERE](https://couple-game.vercel.app/)**

---

## 🎮 The Concept: "Blind Trust"

Unlike standard multiplayer games where both players see the same screen, **Sync Hearts** relies on **Asymmetric Information**:

1.  **The Walker (Player A):** Is trapped in a dark maze. They have **Zero Visibility** (Fog of War) and can only see 1 step ahead.
2.  **The Watcher (Player B):** Has a **God-View** of the entire map, including hidden traps (mined tiles), but **cannot move**.
3.  **The Goal:** The Watcher must verbally guide the Walker to the trophy before the timer runs out. One wrong step on a trap = Game Over.

---

## 📸 Screenshots

| The Lobby | The Walker (Blind) | The Watcher (Guide) |
| :---: | :---: | :---: |
| *[Insert Login Screen Image]* | *[Insert Dark Grid Image]* | *[Insert Full Map Image]* |

---

## 🛠️ Tech Stack & Architecture

This project is a distributed system deployed across two cloud providers to optimize for latency and scalability.

| Component | Technology | Reason for Choice |
| :--- | :--- | :--- |
| **Frontend** | React.js + Vite | Fast HMR and efficient DOM updates for game rendering. |
| **Styling** | Tailwind CSS | Rapid UI development with responsive grid layouts. |
| **Real-Time** | **Socket.io** | Bi-directional event-based communication for sub-100ms latency. |
| **Backend** | Node.js + Express | Lightweight server to handle game state and room logic. |
| **Deployment** | Vercel (FE) + Render (BE) | Decoupled hosting for independent scaling. |

### System Architecture
```mermaid
[Player A (Browser)] <--> [Socket Connection] <--> [Node.js Server] <--> [Socket Connection] <--> [Player B (Browser)]
                                      ^
                                      |
                                [Game State Store]
                                (Rooms, Maps, Timers)























## 🚀 Key Features

### 🔐 Strategic Gameplay (Key & Door)
* Players cannot simply rush to the exit.
* **The Logic:** The Goal is locked (🔒). The Walker must find the Key (🔑) hidden in the maze first to unlock the door (🔓).
* This forces **Backtracking** and strategic planning between the pair.

### 😈 The Chaos System (Mirror Curse)
* To prevent gameplay from becoming static, I implemented a **Dynamic Event System**.
* **Trigger:** Every few seconds, there is a probability of a "Curse" activating.
* **Effect:** The screen turns RED, and **Controls are Inverted** (Up becomes Down, Left becomes Right) for 5 seconds.
* **Tech:** Handled via server-side state broadcasting to ensure both players experience the chaos simultaneously.

### 📈 Progressive Difficulty
* The game gets harder as you win.
* **Level 1:** 60s Time.
* **Level 4:** 30s Time + High Trap Density.
* State is persisted across levels without page reloads.
