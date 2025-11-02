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


## 🚀 Getting Started

### Prerequisites
- [List your prerequisites here]

### Installation
1. Clone the repository
   ```bash
   git clone https://github.com/pestechnology/PESU_RR_CSE_C_P36_Micro_Donation_Platform_MDP.git
   cd PESU_RR_CSE_C_P36_Micro_Donation_Platform_MDP
   ```

2. Install dependencies
   ```bash
   # Add your installation commands here
   ```

3. Run the application
   ```bash
   # Add your run commands here
   ```

## 📁 Project Structure

```
PESU_RR_CSE_C_P36_Micro_Donation_Platform_MDP/
├── src/                 # Source code
├── docs/               # Documentation
├── tests/              # Test files
├── .github/            # GitHub workflows and templates
├── README.md          # This file
└── ...
```

## 🛠️ Development Guidelines

### Branching Strategy
- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches

### Commit Messages
Follow conventional commit format:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test-related changes

### Code Review Process
1. Create feature branch from `develop`
2. Make changes and commit
3. Create Pull Request to `develop`
4. Request review from team members
5. Merge after approval

## 📚 Documentation

- [API Documentation](docs/api.md)
- [User Guide](docs/user-guide.md)
- [Developer Guide](docs/developer-guide.md)

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📄 License

This project is developed for educational purposes as part of the PES University UE23CS341A curriculum.

---

**Course:** UE23CS341A  
**Institution:** PES University  
**Academic Year:** 2025  
**Semester:** 5th Sem

## 🔔 Recent changes (added features)

The backend donation flow was enhanced to better record and track donation events. Changes added in this update:

- Donation submission endpoint improvements
   - POST `/api/donate/` now accepts `causeId` and `amount` (required).
   - Optional `paymentId` and `paymentMethod` can be provided; a `paymentId` will be generated when omitted.
   - The endpoint validates cause status and end date before accepting donations.

- Donation metadata recorded
   - User donation entries now include `causeId` (reference), `paymentId`, `paymentMethod`, and `status` (pending/completed/failed) while keeping the human-readable `cause` name for backwards compatibility.

- Cause updates
   - A successful donation increments the cause's `currentAmount` and `donorCount` and updates the cause `status` to `completed` if the target is reached.

- Backwards compatible storage
   - Existing `donations` subdocuments on `User` remain usable; new payment fields were added in a compatible fashion.

These changes prepare the backend for later integration with a real payment gateway and improved reporting/receipts.
