# Micro-Donation Platform

**Project ID:** P36  
**Course:** UE23CS341A  
**Academic Year:** 2025  
**Semester:** 5th Sem  
**Campus:** RR  
**Branch:** CSE  
**Section:** C  
**Team:** MDP

## 📋 Project Description

A portal for allocating small contributions to multiple causes, aggregating total donations per cause, and visualizing impact via summary charts. The project uses secure payment-gateway stubs, transactional database operations, and dashboarding components.

This repository contains the source code and documentation for the Micro-Donation Platform project, developed as part of the UE23CS341A course at PES University.

## 🧑‍💻 Development Team (MDP)

- [@basanagouda6174](https://github.com/basanagouda6174) - Scrum Master
- [@pes1ug23cs178](https://github.com/pes1ug23cs178) - Developer Team
- [@bharathkc05](https://github.com/bharathkc05) - Developer Team
- [@DHANUSH222005](https://github.com/DHANUSH222005) - Developer Team

## 👨‍🏫 Teaching Assistant

- [@amritaak06](https://github.com/amritaak06)

## 👨‍⚖️ Faculty Supervisor

- [@mhradhika](https://github.com/mhradhika)


## 🏗️ Architecture

### Technology Stack

**Backend:**
- Node.js (v18.x / v20.x)
- Express.js - REST API framework
- MongoDB - NoSQL database with Mongoose ODM
- JWT - Authentication & session management
- Nodemailer - Email verification & notifications
- Pino - Structured logging
- Jest & Supertest - Testing framework

**Frontend:**
- React 18.x - UI framework
- Vite - Build tool & dev server
- React Router - Client-side routing
- Axios - HTTP client
- Recharts - Data visualization
- Tailwind CSS - Styling framework

**DevOps & CI/CD:**
- GitHub Actions - Automated testing & deployment
- ESLint - Code quality
- npm audit - Security scanning

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.x or v20.x)
- MongoDB (v7.0 or higher)
- npm or yarn package manager
- Git

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/pestechnology/PESU_RR_CSE_C_P36_Micro_Donation_Platform_MDP.git
   cd PESU_RR_CSE_C_P36_Micro_Donation_Platform_MDP
   ```

2. Install backend dependencies
   ```bash
   cd src/backend
   npm install
   ```

3. Install frontend dependencies
   ```bash
   cd ../frontend
   npm install
   ```

4. Configure environment variables
   ```bash
   cd ../backend
   cp .env.example .env
   # Edit .env with your configuration (MongoDB URI, JWT secret, etc.)
   ```

5. Run the application

   **Development Mode:**
   ```bash
   # Terminal 1 - Backend (from src/backend)
   npm run dev
   
   # Terminal 2 - Frontend (from src/frontend)
   npm run dev
   ```

   **Production Mode:**
   ```bash
   # Backend (from src/backend)
   npm start
   
   # Frontend (from src/frontend)
   npm run build
   npm run preview
   ```

6. Access the application
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 📁 Project Structure

```
PESU_RR_CSE_C_P36_Micro_Donation_Platform_MDP/
├── .github/
│   └── workflows/
│       └── cicd.yml              # CI/CD pipeline configuration
├── src/
│   ├── backend/
│   │   ├── __tests__/            # Jest test suites
│   │   │   ├── middleware/       # Middleware tests
│   │   │   ├── models/           # Model tests
│   │   │   ├── routes/           # API route tests
│   │   │   └── utils/            # Utility function tests
│   │   ├── config/
│   │   │   └── db.js             # Database connection
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT authentication
│   │   │   ├── errorHandler.js   # Global error handling
│   │   │   ├── httpsEnforcer.js  # HTTPS enforcement
│   │   │   └── rateLimiter.js    # Rate limiting
│   │   ├── models/
│   │   │   ├── User.js           # User schema & methods
│   │   │   ├── Cause.js          # Cause schema
│   │   │   ├── AuditLog.js       # Audit log schema
│   │   │   └── PlatformConfig.js # Platform configuration
│   │   ├── routes/
│   │   │   ├── authRoutes.js     # Authentication endpoints
│   │   │   ├── donationRoutes.js # Donation processing
│   │   │   ├── causeRoutes.js    # Cause management
│   │   │   ├── adminRoutes.js    # Admin operations
│   │   │   ├── dashboardRoutes.js# Analytics endpoints
│   │   │   ├── auditLogRoutes.js # Audit log access
│   │   │   ├── configRoutes.js   # Platform config
│   │   │   ├── twoFactorRoutes.js# 2FA setup & verification
│   │   │   └── healthRoutes.js   # Health check endpoint
│   │   ├── scripts/              # Utility & test scripts
│   │   ├── utils/
│   │   │   ├── logger.js         # Pino structured logging
│   │   │   ├── email.js          # Email service
│   │   │   ├── auditLogger.js    # Audit event logging
│   │   │   └── causeStatusUpdater.js # Cause lifecycle
│   │   ├── server.js             # HTTP server entry point
│   │   ├── server-https.js       # HTTPS server entry point
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       │   ├── components/
│       │   │   ├── Navbar.jsx
│       │   │   ├── DonationForm.jsx
│       │   │   ├── DonationStats.jsx
│       │   │   └── TwoFactorSetup.jsx
│       │   ├── pages/
│       │   │   ├── Home.jsx
│       │   │   ├── Login.jsx
│       │   │   ├── Register.jsx
│       │   │   ├── Dashboard.jsx
│       │   │   ├── BrowseCauses.jsx
│       │   │   ├── CauseDetails.jsx
│       │   │   ├── MultiCauseDonation.jsx
│       │   │   ├── MyDonations.jsx
│       │   │   ├── Profile.jsx
│       │   │   ├── ForgotPassword.jsx
│       │   │   ├── ResetPassword.jsx
│       │   │   ├── Verify.jsx
│       │   │   ├── AdminDashboard.jsx
│       │   │   ├── AdminCauseDashboard.jsx
│       │   │   ├── AdminUserManagement.jsx
│       │   │   ├── AdminAnalyticsDashboard.jsx
│       │   │   ├── AdminPreviousDonations.jsx
│       │   │   ├── AdminDonationsByUser.jsx
│       │   │   ├── AdminPlatformConfig.jsx
│       │   │   └── AuditLogsPage.jsx
│       │   ├── hooks/
│       │   │   └── useCurrencyConfig.js
│       │   ├── utils/
│       │   │   ├── csvExport.js
│       │   │   ├── currencyFormatter.js
│       │   │   └── useCurrency.js
│       │   ├── api.js            # API client configuration
│       │   ├── App.jsx           # Root component & routing
│       │   └── main.jsx          # Application entry point
│       ├── index.html
│       ├── vite.config.mjs
│       └── package.json
├── README.md
└── .gitignore
```

## 🛠️ Development Guidelines

### Branching Strategy
- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches (e.g., `feature/Story-5.2-Implement-Structured-Logging`)
- `bugfix/*`: Bug fix branches
- `ci/*`: CI/CD related changes

### Commit Messages
Follow conventional commit format:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test-related changes
- `ci:` CI/CD pipeline changes

### Code Review Process
1. Create feature branch from `develop`
2. Make changes and commit
3. Create Pull Request to `develop`
4. Request review from team members
5. Address feedback and ensure CI passes
6. Merge after approval

## 🧪 Testing

### Backend Testing
```bash
cd src/backend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

**Test Coverage (Current):**
- Statements: 80.46%
- Branches: 73.5%
- Functions: 89.93%
- Lines: 81.83%

**Test Suites:**
- Middleware tests (auth, error handling, rate limiting, HTTPS enforcement)
- Model tests (User, Cause, AuditLog, PlatformConfig)
- Route tests (authentication, donations, causes, admin operations, 2FA, config, audit logs, dashboard, health)
- Utility tests (audit logger, cause status updater)

### CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

**Automated Checks:**
- ✅ Backend tests on Node.js 18.x and 20.x
- ✅ Code linting with ESLint
- ✅ Security scanning with npm audit
- ✅ Test coverage reporting with artifacts
- ✅ Build verification
- ✅ Automated deployment to staging/production

**Workflow Triggers:**
- Push to `develop` or `main` branches
- Pull requests to `develop` or `main`
- Manual workflow dispatch

**Coverage Artifacts:**
- Coverage reports are automatically generated and uploaded
- View detailed HTML reports in workflow artifacts

## 📄 License

This project is developed for educational purposes as part of the PES University UE23CS341A curriculum.

---

**Course:** UE23CS341A  
**Institution:** PES University  
**Academic Year:** 2025  
**Semester:** 5th Sem

## ✨ Features Implemented

### Epic 1: User Authentication & Access Control
- ✅ **MDP-S-01:** Donor registration with email verification
- ✅ **MDP-S-02:** Secure login and session management (JWT-based)
- ✅ **MDP-S-03:** Password reset functionality with tokenized links
- ✅ **MDP-S-04:** Role-Based Access Control (RBAC) - Donor/Admin separation
- ✅ **MDP-S-05:** Two-Factor Authentication (2FA) for admins using TOTP
- ✅ **MDP-S-06:** Complete authentication UI (Login, Register, Password Reset, Verify)

### Epic 2: Core Donation Experience
- ✅ **MDP-S-07:** Browse, search, and filter causes with responsive UI
- ✅ **MDP-S-08:** Backend donation submission API with validation
- ✅ **MDP-S-09:** Atomic transaction recording for donations
- ✅ **MDP-S-10:** Multi-cause donation UI with allocation management
- ✅ **MDP-S-11:** Donation receipt generation and download
- ✅ **MDP-S-12:** Configurable minimum donation amount and currency formatting

### Epic 3: Cause & Platform Administration
- ✅ **MDP-S-13:** Admin dashboard for cause management
- ✅ **MDP-S-14:** Create new causes with metadata and images
- ✅ **MDP-S-15:** Update and archive existing causes
- ✅ **MDP-S-16:** System audit log viewer for admins

### Epic 4: Data Analytics & Impact Visualization
- ✅ **MDP-S-17:** Backend aggregation of donation data
- ✅ **MDP-S-18:** Admin analytics dashboard with interactive charts
- ✅ **MDP-S-19:** CSV export functionality for analytics data
- ✅ **MDP-S-20:** Donor-facing impact visualization with pie charts

### Epic 5: System Foundation & Operational Readiness
- ✅ **MDP-S-21:** HTTPS enforcement with TLS 1.2+ and security headers
- ✅ **MDP-S-22:** Structured logging with Pino (JSON format)
- ✅ **MDP-S-23:** Rate limiting on sensitive endpoints (login, donations)
- ✅ **MDP-S-24:** Secure error handling with user-friendly messages
- ✅ **MDP-S-25:** Health check endpoint for monitoring (`/api/health`)
- ✅ **MDP-S-26:** CI/CD pipeline with automated testing and coverage

## 🎯 Sprint Summary

### Sprint 1 (Foundation & Core Logic)
**Goal:** Establish secure backend foundation and core APIs  
**Story Points:** 53  
**Status:** ✅ Complete

Key Deliverables:
- HTTPS enforcement and structured logging
- Complete authentication system (registration, login, password reset, RBAC)
- Donation processing API with atomic transactions
- Backend data aggregation
- Security features (rate limiting, error handling, health checks)

### Sprint 2 (UI, Integration & Polish)
**Goal:** Complete user interface and integrate with backend APIs  
**Story Points:** 62  
**Status:** ✅ Complete

Key Deliverables:
- Full donor-facing UI (authentication, cause browsing, multi-cause donations)
- Complete admin panel (cause management, user management, analytics)
- Data visualization dashboards for both donors and admins
- 2FA implementation for admin security
- Receipt generation and CSV export functionality
- Platform configuration management

## 🔒 Security Features

- JWT-based authentication with HTTP-only cookies
- Password hashing with bcrypt
- Email verification for new accounts
- Two-Factor Authentication (2FA) for admin accounts
- Rate limiting on sensitive endpoints
- HTTPS enforcement with security headers
- Role-Based Access Control (RBAC)
- Audit logging for security events
- Input validation and sanitization
- Secure session management with automatic timeout

## 📊 Key Metrics

- **Total User Stories:** 26
- **Total Story Points:** 115
- **Backend Coverage:** 80.46% statements, 73.5% branches
- **API Endpoints:** 40+ RESTful endpoints
- **Test Suites:** 30+ comprehensive test files
- **Supported Node Versions:** 18.x, 20.x
- **CI/CD Pipeline:** Automated testing, linting, security scanning, deployment
