# Micro Donation Platform - Backend API

##  Table of Contents
- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Database Models](#database-models)
- [Middleware](#middleware)
- [Security Features](#security-features)
- [Email Service](#email-service)
- [Scripts](#scripts)
- [Running the Application](#running-the-application)

---

##  Overview

The backend API for the Micro Donation Platform (MDP) is a RESTful service built with Node.js and Express. It provides authentication, user management, and donation tracking functionality for a charitable donation platform.

**Version:** 1.0.0  
**Main Entry Point:** `server.js`  
**Module Type:** ES Modules (ESM)

---

##  Technology Stack

### Core Technologies
- **Node.js** - JavaScript runtime
- **Express.js** (v4.18.2) - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** (v7.0.0) - MongoDB ODM

### Authentication & Security
- **jsonwebtoken** (v9.0.0) - JWT token generation and verification
- **bcryptjs** (v2.4.3) - Password hashing
- **helmet** (v7.0.0) - HTTP security headers
- **express-rate-limit** (v6.7.0) - Rate limiting middleware
- **cors** (v2.8.5) - Cross-Origin Resource Sharing

### Additional Libraries
- **nodemailer** (v7.0.10) - Email sending service
- **dotenv** (v16.0.0) - Environment variable management
- **morgan** (v1.10.0) - HTTP request logger

### Development Tools
- **nodemon** (v3.1.10) - Auto-restart server on file changes

---

##  Project Structure

```
backend/
├── config/
│   └── db.js                 # MongoDB connection configuration
├── middleware/
│   ├── auth.js               # JWT authentication & authorization middleware
│   └── errorHandler.js       # Global error handling middleware
├── models/
│   └── User.js               # User and Donation mongoose schemas
├── routes/
│   ├── authRoutes.js         # Authentication-related endpoints
│   └── donationRoutes.js     # Donation management endpoints
├── scripts/
│   └── listUsers.js          # Utility script to list all users
├── utils/
│   └── email.js              # Email sending utilities
├── app.js                    # Express app configuration (alternative)
├── index.js                  # Simple test server (alternative)
├── server.js                 # Main application entry point
├── package.json              # Dependencies and scripts
└── tmp_reg.json              # Temporary registration data (dev)
```

---

##  Features

### 1. **User Authentication System**
- User registration with email verification
- Secure login with JWT tokens
- Password hashing with bcrypt
- Email verification workflow
- Resend verification email functionality
- Password reset via email
- Token-based authentication

### 2. **User Management**
- User profile management
- Role-based access control (donor/admin)
- User profile with customizable fields:
  - Phone number
  - Address
  - Preferred causes



### 3. **Security Features**
- Password encryption
- JWT token authentication
- Rate limiting (100 requests per 15 minutes)
- HTTP security headers (Helmet)
- CORS protection
- Request body size limiting (10KB)
- Token expiration (1 hour)

### 4. **Email Notifications**
- Email verification after registration
- Password reset emails
- Support for both SMTP and test accounts (Ethereal)

---

##  Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB instance (local or cloud)
- npm or yarn package manager

### Installation Steps

1. **Clone the repository and navigate to backend:**
   ```bash
   cd src/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   # Create .env file in the backend directory
   touch .env
   ```

4. **Configure environment variables** (see below)

5. **Start the server:**
   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

---
