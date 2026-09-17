# WhatsCRM & MsgMagnet Multi-Channel SaaS Platform

Comprehensive AI Automation, WhatsApp CRM, and Multi-Channel SaaS platform with Mobile App support.

## Project Structure

* **`whatsappcrm/`**: Full Node.js/Express backend server, web dashboard, user and admin portals, WhatsApp multi-session gateway, and AI automation engine.
* **`msgmagnet-app/`**: React Native & Expo mobile field-agent application with AI Business Card Scanner, Kanban Sales Pipeline, Geo-Network Map, and Tasks.
* **`database/`**: MySQL database schema and initial data (`import.sql`).

---

## Quick Start Guide

### 1. Database Setup
1. Start MySQL (e.g. via XAMPP or native MySQL).
2. Create a database named `whatscrm`.
3. Import `database/import.sql`.

### 2. Backend Server (`whatsappcrm`)
```bash
cd whatsappcrm
npm install
npm run start # or node server.js
```
The backend server runs on `http://localhost:3010`.

### 3. Mobile App (`msgmagnet-app`)
```bash
cd msgmagnet-app
npm install
npx expo start
```
Use Android emulator or physical device with USB debugging enabled (`adb reverse tcp:8081 tcp:8081` and `adb reverse tcp:3010 tcp:3010`).
