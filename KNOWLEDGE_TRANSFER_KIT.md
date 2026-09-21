# Knowledge Transfer (KT) Kit: WhatsCRM & MsgMagnet Mobile CRM

> **Bundle Name**: WhatsCRM - WhatsApp CRM, AI Automation & Multi-Channel SaaS Platform  
> **Mobile App**: MsgMagnet Companion App (React Native / Expo)  
> **Version**: 5.9.8 (Backend/Web) | 1.0.0 (Mobile)  
> **Last Updated**: September 2026  

---

## 1. Executive Summary & Architecture Overview

WhatsCRM is an enterprise-ready, multi-tenant SaaS bundle designed for WhatsApp marketing, conversational CRM, team inbox collaboration, AI workflow automation, and mobile lead management. It integrates with both the **Official Meta WhatsApp Cloud API** and **Baileys Web QR WhatsApp**, alongside Telegram, Instagram, and Facebook Messenger.

The bundle consists of three primary modules:
1. **`whatsappcrm/`**: Node.js/Express backend, Socket.IO real-time engine, background campaign loops, and built React web frontend (Admin & User Portals).
2. **`msgmagnet-app/`**: Cross-platform React Native (Expo SDK 52) mobile app for Android/iOS with camera OCR business card scanning, offline SQLite caching, NFC, and dynamic Kanban board.
3. **`database/`**: MySQL relational schema (`import.sql`) pre-seeded with tables, roles, subscription plans, and chatbot engine structures.

### High-Level System Architecture

```mermaid
graph TD
    subgraph Clients ["Client Applications"]
        WebAdmin["Web Admin Portal (React SPA)"]
        WebUser["Web User Portal (React SPA)"]
        MobileApp["MsgMagnet Mobile App (Expo / React Native)"]
    end

    subgraph BackendGateway ["Node.js / Express Server (Port 3010)"]
        APIRouter["Express API Routes (/api/v1/*)"]
        AuthMid["JWT Auth & Role Middlewares (Admin/User/Agent)"]
        SocketServer["Socket.IO Server (Real-time events & QR stream)"]
        CampaignLoops["Background Loops (Rate-limited Broadcasts)"]
    end

    subgraph CoreServices ["Specialized Services"]
        GeminiVision["Gemini Vision AI (Business Card Scanner)"]
        GeminiAudio["Gemini Audio AI (Meeting Summarizer)"]
        ChatbotEngine["Chatbot Flow Engine (ReactFlow Evaluator)"]
        BaileysManager["Baileys Multi-Device QR Manager"]
        MetaCloudAPI["Meta Graph API Connector"]
    end

    subgraph DataStore ["Database & Media"]
        MySQL[("MySQL 8.x Database (whatscrm)")]
        LocalMedia["Local Storage (/client/public/media)"]
        MobileSQLite[("Expo SQLite (Mobile Offline Sync)")]
    end

    WebAdmin -->|REST / JWT| APIRouter
    WebUser -->|REST / JWT| APIRouter
    WebUser <-->|WebSocket| SocketServer
    MobileApp -->|REST / Bearer Token| APIRouter
    MobileApp <-->|Local Cache| MobileSQLite

    APIRouter --> AuthMid
    AuthMid --> ChatbotEngine
    AuthMid --> GeminiVision
    AuthMid --> GeminiAudio

    APIRouter --> MySQL
    CampaignLoops --> MySQL
    CampaignLoops --> BaileysManager
    CampaignLoops --> MetaCloudAPI
    ChatbotEngine --> MetaCloudAPI
    ChatbotEngine --> BaileysManager
    GeminiVision --> LocalMedia
```

---

## 2. Codebase Structure & Directory Map

```text
whatscrm-bundle/
├── database/
│   └── import.sql                     # Full MySQL schema, initial data & table setups
│
├── msgmagnet-app/                     # React Native Expo Mobile App
│   ├── app/                           # Expo Router / Navigation root
│   ├── src/
│   │   ├── components/                # Reusable UI components (buttons, modals, cards)
│   │   ├── navigation/                # BottomTabs, Stack navigators
│   │   ├── screens/                   # App screens (CardScanScreen, KanbanScreen, etc.)
│   │   ├── services/                  # API client (axios), SQLite offline cache, storage
│   │   └── types/                     # TypeScript declarations
│   ├── app.json                       # Expo configuration & app permissions
│   └── package.json                   # React Native 0.76.9, Expo 52 dependencies
│
└── whatsappcrm/                       # Core Node.js Backend & Web Application
    ├── client/                        # React Frontend Source & Static Build
    │   ├── build/                     # Production compiled frontend bundle
    │   └── public/media/              # Uploaded media (images, audio, templates)
    ├── helper/                        # Core communication adapters & chatbots
    │   ├── addon/                     # Addon modules (wacall, webPush, webhook)
    │   ├── chatbot/meta/              # Meta Cloud API flow graph processor
    │   ├── inbox/                     # Omnichannel message ingestion & dispatch
    │   └── socket/                    # Socket.IO event forwarders & handlers
    ├── loops/                         # Background cron-style campaign runners
    │   ├── campaignBeta.js            # Bulk WhatsApp campaign loop
    │   └── qrCampaignLoop.js          # Baileys QR campaign queue dispatcher
    ├── middlewares/                   # Express authorization guards
    │   ├── admin.js                   # Super-admin privilege verifier
    │   ├── user.js                    # Tenant user auth (JWT validator)
    │   ├── agent.js                   # Sub-agent access control
    │   └── plan.js                    # Feature flags & subscription limit enforcement
    ├── routes/                        # REST Controllers & Endpoints
    │   ├── admin.js                   # User management, plans, system settings
    │   ├── user.js                    # User profile, channels, billing
    │   ├── cardScan.js                # AI Business Card OCR & Contact Extraction
    │   ├── kaban.js                   # Dynamic Kanban board, pipelines & stages
    │   ├── chatbot.js / chatFlow.js   # Chatbot builder CRUD & webhook execution
    │   ├── broadcast.js               # Marketing broadcast campaigns
    │   ├── phonebook.js               # Contacts, tag management, CSV import
    │   ├── qr.js                      # Baileys WhatsApp QR session pairing
    │   ├── digitalProfile.js          # Digital business card & vCard exporter
    │   ├── walletPass.js              # Apple Wallet & Google Wallet pass generator
    │   ├── meetingSummarizer.js       # Voice notes & audio transcription (Gemini)
    │   └── reviverSequences.js        # Automated re-engagement for ghosted leads
    ├── services/                      # AI & Integration layer
    │   ├── geminiVision.js            # Gemini Vision API for business cards
    │   ├── geminiAudio.js             # Gemini Audio API for voice note intelligence
    │   ├── leadScoring.js             # Rule-based & AI lead qualification scoring
    │   └── roundRobinService.js       # Automatic lead assignment among team agents
    ├── server.js                      # Express application entry point (port 3010)
    └── socket.js                      # Socket.IO connection lifecycle & events
```

---

## 3. Core Feature Deep-Dives

### 3.1 AI Business Card Scanner (MsgMagnet & Backend)
- **Problem Solved**: Field sales reps collect physical business cards at conferences and need immediate contact extraction into the CRM without manual typing.
- **Workflow**:
  1. Rep opens **MsgMagnet App** -> Navigates to **Card Scanner** (`CardScanScreen.tsx`).
  2. Camera captures single photo or batch multi-card photos.
  3. App sends a `multipart/form-data` POST request to `/api/v1/card-scan/process` (or `/process-batch`).
  4. Backend controller (`routes/cardScan.js`) saves image to `whatsappcrm/client/public/media/cards/`.
  5. `services/geminiVision.js` invokes Google Gemini Vision API (`gemini-1.5-flash` or `gemini-2.0-flash`) with a structured JSON schema prompt.
  6. Gemini returns parsed fields:
     - `name`, `phone`, `email`, `company`, `job_title`, `address`, `website`, `notes`.
  7. Backend automatically creates or updates the contact in MySQL table `contact` with `source = 'card_scan'`.
  8. Phone number is cleaned and sanitized (international formatting without symbols).
- **Recent Fixes**:
  - Sanitized buffer parsing to eliminate 400 Bad Request errors when handling base64 vs binary multipart uploads.
  - Added fallback parsing in case Gemini returns markdown JSON codeblocks (` ```json `).

---

### 3.2 Dynamic Kanban Board & Lead Pipelines
- **Problem Solved**: Sales workflows require flexible columns (e.g. *New Lead*, *Contacted*, *Demo Scheduled*, *Closed Won*). Contacts imported without explicit tags previously vanished or broke the UI.
- **Implementation**:
  - Controlled by `routes/kaban.js` (`/api/v1/kaban/get-board-data` and `/api/v1/kaban/update-stage`).
  - **Dynamic Unlabeled Stage**: If contacts do not have a defined stage ID, the backend dynamically categorizes them into an **"Unlabeled" / "Incoming Leads"** column.
  - Moving a card across columns updates the contact's tag/stage in MySQL in real-time, instantly notifying other web and mobile sessions via Socket.IO.

---

### 3.3 Multi-Channel WhatsApp Engines
The platform supports dual-mode WhatsApp communication:
1. **Official WhatsApp Cloud API (Meta Graph API)**:
   - Suitable for verified business accounts with high throughput and official template approval.
   - Webhook endpoint (`routes/webhook.js`) receives message statuses (`sent`, `delivered`, `read`) and incoming user replies.
2. **Baileys Web QR Mode**:
   - Built on `@whiskeysockets/baileys` and `mysql-baileys`.
   - Allows users without Meta Business verification to pair their personal or business WhatsApp number via QR code.
   - Real-time QR code data is pushed to the client via Socket.IO stream (`routes/qr.js`).
   - Session keys and creds are securely stored in the MySQL table `baileys_auth`.

---

### 3.4 Visual Chatbot Flow Builder
- Built on top of ReactFlow on the frontend, processed by `helper/chatbot/meta/index.js` on the backend.
- **Supported Node Types**:
  - `INITIAL`: Entry point triggered by keyword matching or new chat event.
  - `SEND_MESSAGE`: Text, Buttons, List Messages, Image/Video attachments.
  - `CONDITION`: String contains, equals, regex, or phone number rules.
  - `MAKE_REQUEST`: External webhook call to third-party APIs (Zapier, Make, custom CRM).
  - `AI_TRANSFER`: Delegates conversation to OpenAI (GPT-4o) or Google Gemini with customized system prompt and conversation history context.

---

### 3.5 Broadcast Campaigns & Background Queue
- **Files**: `loops/campaignBeta.js`, `loops/qrCampaignLoop.js`, `routes/broadcast.js`.
- **Anti-Ban Architecture**:
  - Implements randomized delays between successive message dispatches (e.g., 5 to 15 seconds).
  - Batching mechanisms prevent IP or phone number rate limits.
  - Campaign metrics tracked per contact: `PENDING`, `PROCESSING`, `SENT`, `FAILED`.

---

### 3.6 Meeting Audio Summarizer & Voice Intelligence
- **File**: `services/geminiAudio.js`, `routes/meetingSummarizer.js`.
- Users upload `.mp3`, `.wav`, or `.m4a` audio recordings of sales calls or meetings.
- Audio is processed by Gemini Audio model to extract:
  - Concise meeting summary.
  - Action items and assigned owners.
  - Customer sentiment and purchase intent score (0-100).

---

## 4. Environment Variables & Setup Configuration

The backend reads configuration from `whatsappcrm/.env`. Create this file from `.env.example`:

```bash
# Server Port & Mode
PORT=3010
NODE_ENV=production

# Database Configuration (MySQL)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=whatscrm

# Security & Authentication
JWT_SECRET=your_super_secret_jwt_key_32_characters_long
SESSION_SECRET=your_session_secret_key

# AI Provider API Keys
GEMINI_API_KEY=AIzaSy...your_gemini_api_key
OPENAI_API_KEY=sk-proj-...your_openai_api_key

# Application URLs
CLIENT_URL=http://localhost:3010
BACKEND_URL=http://localhost:3010

# Push Notifications (Firebase Admin SDK)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### MsgMagnet Mobile App Config (`msgmagnet-app/src/services/api.ts`)
The mobile app communicates with the backend API. When developing locally over USB:
- Run `adb reverse tcp:3010 tcp:3010` to forward device traffic to your PC.
- Configure base URL:
  ```typescript
  export const API_BASE_URL = 'http://localhost:3010/api/v1';
  ```
- For production or network testing, replace `localhost` with your server's domain: `https://your-crm-domain.com/api/v1`.

---

## 5. Local Setup & Running Instructions

### Step 1: Database Setup
1. Ensure MySQL 8.x is running.
2. Create database:
   ```sql
   CREATE DATABASE whatscrm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Import schema:
   ```bash
   mysql -u root -p whatscrm < database/import.sql
   ```

### Step 2: Start WhatsCRM Backend & Web App
1. Open a terminal in `whatsappcrm`:
   ```bash
   cd whatsappcrm
   npm install
   node server.js
   ```
2. The server will start on port `3010`:
   - **User / Admin Login**: `http://localhost:3010`
   - Default admin credentials (from `database/import.sql`):
     - **Email**: `admin@admin.com`
     - **Password**: `12345678`

### Step 3: Run MsgMagnet Mobile App
1. Open a separate terminal in `msgmagnet-app`:
   ```bash
   cd msgmagnet-app
   npm install
   ```
2. Connect your Android phone via USB with USB Debugging enabled.
3. Set up ADB reverse port forwarding:
   ```bash
   adb devices
   adb reverse tcp:3010 tcp:3010
   adb reverse tcp:8081 tcp:8081
   ```
4. Start Expo dev server:
   ```bash
   npx expo start
   ```
5. Press `a` in the terminal to launch the app on your connected Android device.

---

## 6. Key API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/user/login` | User/Admin authentication, returns JWT token | None |
| `GET` | `/api/v1/user/me` | Current user profile, permissions & quotas | User/Admin JWT |
| `POST` | `/api/v1/card-scan/process` | Upload business card image, extract via Gemini Vision | User JWT |
| `POST` | `/api/v1/card-scan/process-batch` | Upload multiple business cards for batch OCR | User JWT |
| `GET` | `/api/v1/kaban/get-board-data` | Retrieve Kanban stages, columns & contact cards | User JWT |
| `POST` | `/api/v1/kaban/update-stage` | Move contact to new pipeline stage | User JWT |
| `GET` | `/api/v1/phonebook/get-contacts` | List contacts with filtering, search & pagination | User JWT |
| `POST` | `/api/v1/phonebook/add-contact` | Create new contact record | User JWT |
| `GET` | `/api/v1/qr/get-qr` | Fetch current Baileys WhatsApp QR code state | User JWT |
| `POST` | `/api/v1/broadcast/create-campaign` | Queue new bulk WhatsApp marketing campaign | User JWT |
| `POST` | `/api/v1/meeting-summarizer/upload` | Upload audio file for Gemini transcription & summary | User JWT |
| `POST` | `/api/v1/chatbot/save-flow` | Persist ReactFlow chatbot graph definition | User JWT |

---

## 7. Troubleshooting & Common Pitfalls

1. **GitHub Push Protection (Secret Scanning)**:
   - **Never commit `.json` GCP service account keys or `.env` files.**
   - [`.gitignore`](file:///c:/Users/Hydizo/Downloads/whatscrm-whatsapp-crm-ai-automation-and-multichannel-saas-bundle-nodejs-script/.gitignore) is configured to ignore `whatsappcrm/client/public/media/*.json` and `whatsappcrm/client/public/media/cards/`.
   - Always ensure dummy placeholders like `sk-proj-REPLACE_WITH_YOUR_OPENAI_API_KEY` are used in database dump files.

2. **Mobile App Cannot Connect to Backend (Network Error)**:
   - Physical Android devices over USB need ADB reverse forwarding: `adb reverse tcp:3010 tcp:3010`.
   - If testing over Wi-Fi, ensure your phone and computer are on the same Wi-Fi subnet and use your machine's local IP (e.g. `http://192.168.1.X:3010`).

3. **Baileys QR Not Scanning / Session Expired**:
   - Baileys QR code refreshes every 20-30 seconds.
   - If reconnect loops fail, delete the associated session record in the `baileys_auth` database table to generate a fresh QR token.

4. **Card Scanner Returns 400 Bad Request**:
   - Verify `GEMINI_API_KEY` is populated in `whatsappcrm/.env`.
   - Ensure the image payload is transmitted with the key `cardImage` in `multipart/form-data`.
