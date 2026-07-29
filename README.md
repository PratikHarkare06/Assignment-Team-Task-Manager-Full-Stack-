# 🚀 Momentum - Enterprise Team Task Manager

A high-performance, full-stack, real-time Project and Task Management Web Application designed for enterprise teams. 

Built with **React 19, Node.js, Express, MongoDB Atlas, and Socket.io**, and fully deployed on **Render** (via Render Blueprints).

### 🌐 Live Deployment
- **Live Application URL:** [https://momentum-app-m4cz.onrender.com](https://momentum-app-m4cz.onrender.com)
- **Backend API URL:** [https://momentum-api-qq9e.onrender.com](https://momentum-api-qq9e.onrender.com)

---

## ✨ Key Features & Enterprise Additions

### 🛠️ Core Capabilities
* **Authentication & RBAC**: Secure Firebase-backed sign-in with robust role checks (Admins vs. Members).
* **Interactive Kanban Board**: Fully responsive drag-and-drop workflow tracking with columns for To Do, In Progress, Blocked, and Completed.
* **Team Space**: Centralized workspace management to view online statuses, activity metrics, and role assignments.

### 🌟 Advanced Enterprise Features (New)
* **📋 Subtasks & Checklists**: Create granular subtasks within any task, complete with real-time checkbox status updates and completion ratio tracking.
* **🏷️ Custom Tags & Labels**: Categorize tasks with custom color-coded labels (e.g., Bug, Feature, Backend, Design) via an interactive picker.
* **📊 Gantt / Timeline View**: Track project timelines and schedule dependencies visually using a custom interactive Gantt chart.
* **📄 Exportable PDF Reports**: Generate, customize, and download printable project reports detailing task breakdowns, resource allocations, and progress metrics.
* **🔔 Live Socket.io Notifications**: Real-time popover notifications for task assignments, updates, and member activities.
* **👥 Project Member Scoping**: Assign team members to specific projects to restrict access and visibility to authorized personnel only.
* **✉️ Real-Time Invitation System**: Invite users by email with automatic secure temporary password generation, instant notification broadcast, and shareable copy-to-clipboard invite links.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, Redux Toolkit, Socket.io-client, Recharts, Lucide React |
| **Backend** | Node.js, Express.js, Firebase Admin SDK, Socket.io, Helmet (Security), Express Rate Limit |
| **Database** | MongoDB Atlas & Mongoose |
| **Deployment** | Render (Infrastructure-as-Code via `render.yaml` blueprint) |

---

## ⚙️ Local Setup Instructions

### 1. Prerequisites
- Node.js (v20 or higher)
- A MongoDB Atlas database connection string
- A Firebase Project (for client-side auth)

### 2. Backend Setup
```bash
cd server
npm install
```
Create a `.env` file inside the `server` folder:
```env
PORT=8000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173
FIREBASE_PROJECT_ID=your_firebase_project_id
```
Run the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
```
Create a `.env` file inside the `client` folder:
```env
VITE_API_URL=http://localhost:8000/api
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
```
Run the development client:
```bash
npm run dev
```

---

## 🚀 One-Click Production Deployment (Render)

This repository includes a `render.yaml` blueprint config file for easy orchestration of both backend API and frontend static hosting in one click.

1. Go to your **Render Dashboard** → **Blueprints** → **New Blueprint Instance**.
2. Connect your GitHub repository.
3. Provide the secret environment variables (`MONGO_URI`, `JWT_SECRET`, Firebase configs) when prompted.
4. Render will automatically provision:
   - **Backend Web Service** running Node.js.
   - **Frontend Static Site** running the Vite production build.
5. In your `momentum-app` (Static Site) configuration, verify `VITE_API_URL` is set to your deployed backend URL.

---

## 📸 Application Preview
<img width="2940" height="1668" alt="image" src="https://github.com/user-attachments/assets/700f3069-425e-4762-950c-039be29c0133" />

*Developed as a high-performance workspace tool.*
