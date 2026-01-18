# 🏥 Kumbh Medical System

A comprehensive medical assistance system designed for the Kumbh Mela, providing AI-powered health recommendations, emergency tracking, and multilingual support for devotees.

## ✨ Features

- **🤖 AI-Powered Medical Chatbot**: Get personalized health recommendations based on symptoms
- **🌡️ Real-time Weather Integration**: Displays current weather conditions with heat warnings and pollution alerts
- **🗺️ Emergency Tracking**: Track and manage medical incidents with interactive maps
- **👥 Devotee Registration**: Register devotees with QR code generation for quick identification
- **🌍 Multilingual Support**: Available in English, Hindi, and Marathi
- **📱 Progressive Web App**: Installable on mobile devices for offline access
- **👤 Face Recognition**: Advanced face detection capabilities for security

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for styling
- **Leaflet** for interactive maps
- **Face-api.js** for face recognition
- **PWA** support with service workers

### Backend
- **Express.js** REST API
- **MongoDB** with Mongoose ODM
- **OpenWeatherMap API** for weather data

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account (or local MongoDB instance)
- OpenWeatherMap API key

## 🛠️ Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/kshitizz-08/kumbh-medical-system.git
cd kumbh-medical-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the project root with the following variables:

```env
MONGODB_URI=your_mongodb_connection_string
OPENWEATHER_API_KEY=your_openweather_api_key
PORT=4000
```

See `.env.example` for reference.

### 4. Run the application

**Start the backend server:**
```bash
npm run dev:server
```

**Start the frontend development server (in a separate terminal):**
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

## 🏗️ Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

## 🚀 Deployment on Render

### Automatic Deployment

This project includes a `render.yaml` configuration for easy deployment.

1. **Create a Render account** at [render.com](https://render.com)

2. **Connect your GitHub repository**:
   - Click "New +" → "Blueprint"
   - Select your GitHub repository
   - Render will automatically detect the `render.yaml` configuration

3. **Add Environment Variables** in the Render dashboard:
   - `MONGODB_URI`: Your MongoDB connection string
   - `OPENWEATHER_API_KEY`: Your OpenWeatherMap API key

4. **Deploy**: Render will automatically build and deploy both the frontend and backend

### Manual Deployment

Alternatively, you can create services manually:

**Backend (Web Service)**:
- Build Command: `npm install`
- Start Command: `npm start`
- Add environment variables

**Frontend (Static Site)**:
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

## 📁 Project Structure

```
project/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── lib/               # Utilities and helpers
│   └── App.tsx            # Main application component
├── server/                # Backend Express API
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   └── index.js           # Server entry point
├── public/                # Static assets
├── dist/                  # Production build (generated)
└── package.json           # Dependencies and scripts
```

## 🔧 Available Scripts

- `npm run dev` - Start frontend development server
- `npm run dev:server` - Start backend API server
- `npm run build` - Build frontend for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## 🌐 API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/devotees` - Register a new devotee
- `GET /api/devotees/:id` - Get devotee by ID
- `POST /api/incidents` - Report a medical incident
- `GET /api/incidents` - Get all incidents
- `POST /api/chatbot` - Get AI medical recommendations
- `GET /api/weather` - Get current weather data

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 👨‍💻 Developer

**Kshitiz** - [@kshitizz-08](https://github.com/kshitizz-08)

## 🙏 Acknowledgments

- Built for the Kumbh Mela to assist devotees with medical needs
- Weather data provided by OpenWeatherMap
- Maps powered by Leaflet and OpenStreetMap
