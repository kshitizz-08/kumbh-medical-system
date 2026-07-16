# 🏥 Nashik Kumbh Mela Medical Seva (Simhastha 2026)

A real-time, offline-capable digital healthcare, devotee tracking, and emergency response platform designed specifically for the world's largest gathering—the Nashik Simhastha Kumbh Mela 2026.

---

## 🌟 Core Features

### 1. 📋 Devotee Registration & QR Pass
*   **Simple Onboarding:** Quick form to register devotee details (Age, Gender, Blood Group, Phone, Emergency Contacts).
*   **Photo Capture:** Camera-based selfie capture with client-side face validation.
*   **Printable Pass:** Auto-generates a QR code and prints a standardized **Kumbh Medical Pass** containing essential contact info for emergency first-responders.

### 2. 👥 Multi-Modal Search & AI Face Recognition
*   **Fast Search:** Search by name, phone number, or by scanning the QR code on a devotee's pass.
*   **AI Face Match:** In emergencies (e.g., stampede, unconscious pilgrim), responders can take a quick picture to scan and match the devotee's face descriptor locally using YOLOv8 & Face-API.js. Matches are processed in milliseconds to instantly pull up the medical record.

### 3. 🚨 Smart AI Chatbot (Tri-Language: EN, HI, MR)
*   **3-Layer Response System:** 
    1.  *Local NLP:* Matches medical emergencies (e.g., CPR steps, heat stroke, heart attack) and greets users.
    2.  *Fuzzy Search:* Uses Fuse.js on local knowledge base queries.
    3.  *Gemini 2.0 Flash:* Connects to Google's Gemini API for answering general questions when internet is available.
*   **Premium Chat UI:** Includes text-to-speech, markdown layout rendering, message copying, and responsive styling.

### 4. ☀️ Real-Time Weather & Heat Advisory
*   **Live Metrics:** Compact header badge showing Nashik temperature, humidity, and heat risk status.
*   **Heat warnings:** Automatic visual advisory alert banners if local temperatures reach dangerous levels, reminding volunteers to distribute water and direct pilgrims to shaded sectors.

### 5. 📊 Analytics & Health Dashboard
*   **Overview Stats:** Live count of registrations, active medical centers, and daily incidents.
*   **Demographic breakdown:** Bar charts and pie charts of registered age groups, gender distribution, and incident categories using Recharts.

### 6. 👨‍👩‍👧 Lost & Found System
*   A dedicated portal to report, manage, and track lost family members using AI face descriptors to matching reports.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, TailwindCSS, Lucide Icons, Recharts |
| **Backend** | Node.js, Express, MongoDB (Mongoose), Fuse.js |
| **AI / ML** | YOLOv8 ONNX (Face detection), Face-API.js (Face descriptor), Gemini 2.0 SDK |
| **Offline Support** | Vite PWA Plugin, Workbox Service Worker |

---

## 🚀 Speed & Offline Optimizations
*   **Local Weights Loading:** AI weights are hosted locally on the server instead of CDNs, saving 5MB+ of bandwidth on load.
*   **WASM & Model Caching:** PWA caches heavy ONNX runtime binaries (26.2MB) and models in the browser cache, letting the app load in `<50ms` on repeat visits.
*   **esbuild Bundling:** Optimized Vite config targeting modern browser specifications (`ES2022`) to deliver lightweight, highly minified packages.

---

## 💻 Running Locally

### 1. Prerequisites
*   Node.js (>= 18.0)
*   MongoDB Instance (Local or Atlas)

### 2. Configuration (`.env`)
Create a `.env` file in the `project/` directory:
```env
MONGODB_URI=mongodb+srv://...your_mongodb_connection_string...
OPENWEATHER_API_KEY=...your_openweather_api_key...
GEMINI_API_KEY=AIzaSy...your_gemini_api_key_from_google_ai_studio...
```

### 3. Installation
```bash
# Clone the repository
git clone https://github.com/kshitizz-08/kumbh-medical-system.git
cd kumbh-medical-system/project

# Install npm dependencies
npm install
```

### 4. Start the Application
```bash
# Run backend server (Port 4000)
npm run dev:server

# Run frontend dev server (Port 5173)
npm run dev
```

---

## 📄 License
This project is created for educational and emergency services administration purposes during the Nashik Simhastha Kumbh Mela.
