# Premium Expense Tracker

A modern, high-performance Expense Tracker built with **React Native (Expo)** and **Firebase**. The app features a premium "Cashew-style" pure black theme with smooth animations, financial analytics, and full CRUD functionality for transactions.

---

## 🚀 Features

- **Premium UI/UX**: Pure black iOS-style dark theme with glassmorphic elements.
- **RGB Animated Avatar**: Profile icons with dynamic, animated RGB borders.
- **Transaction CRUD**: Create, Read, Update, and Delete transactions with ease.
- **Financial Analytics**: Visualize spending via custom SVG donut charts.
- **Authenticated Access**: Secure login/signup via Firebase Authentication.
- **Categorized Tracking**: 12+ colorful categories with custom icons.
- **Real-time Sync**: Data stays in sync across devices using Firestore.

---

## 🛠 Setup & Installation

Follow these steps to get the project running on your local machine.

### 1. Prerequisites
- **Node.js** (v18 or later recommended)
- **npm** or **yarn**
- **Expo Go** app (on your iOS/Android device for testing) or an emulator.

### 2. Clone the Repository
```bash
git clone <your-repo-url>
cd expense-tracker-app
```

### 3. Environment Variables
Create a file named **`.env`** in **both** the `frontend/` and `backend/` directories (or in the root and copy it to both). The frontend **must** have its own `.env` file for Expo to bundle the variables.

Add your Firebase configuration:

```env
# Firebase Configuration (for frontend/ and backend/)
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Backend Configuration
PORT=5000
```
> [!IMPORTANT]
> If you see an `invalid-api-key` error, ensure the `.env` file is located inside the `frontend/` folder where you run `npx expo start`.


### 4. Install Dependencies

**Install Frontend Dependencies:**
```bash
cd frontend
npm install
```

**Install Backend Dependencies:**
```bash
cd ../backend
npm install
```

---

## 🏃 Running the Project

### Start the Backend
The backend serves as an optional API layer for future integrations.
```bash
cd backend
npm run dev
```

### Start the Frontend
Open a new terminal and run:
```bash
cd frontend
npx expo start
```
- Press **`a`** for Android Emulator.
- Press **`i`** for iOS Simulator.
- Scan the **QR Code** with the Expo Go app to run on a physical device.

---

## 🏗 Project Structure

```text
├── backend/            # Express.js Server
│   ├── src/
│   │   ├── server.js   # Main entry point
│   │   └── middleware/ # Auth middleware
├── frontend/           # React Native App (Expo Router)
│   ├── app/            # Screen components & Routing
│   ├── components/     # UI Components
│   ├── constants/      # Theme & Colors
│   └── lib/            # Firestore logic & Helpers
└── .env                # Shared environment variables
```

---

## 🛡 License
Distributed under the MIT License. See `LICENSE` for more information.
