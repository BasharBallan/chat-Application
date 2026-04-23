# 🎓 TIC Academy – Enterprise Backend Platform

A powerful, production‑grade backend system built with **Node.js**, **Express**, **MongoDB**, **Redis**, and a fully modular architecture.  
This platform powers an educational system with **secure authentication**, **session management**, **device tracking**, **academic content management**, and **role‑based access control**.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-production-green)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen)
![License](https://img.shields.io/badge/license-Private-red)


---

## ✨ Features

### 🔐 **Enterprise Authentication & Security**
- JWT Access Tokens  
- Refresh Token Rotation  
- Multi‑session login  
- Device & IP tracking  
- Login alerts via email  
- Password reset (verification code)  
- Admin login & signup  
- HTTP‑only cookies  
- Strong password validation  
- Helmet, HPP, Rate Limiting, CORS  

### 🧩 **Academic Management System**
- Years  
- Semesters  
- Subjects  
- Lectures  
- Saved lectures  
- Doctor lecture management  
- Student lecture access  
- File uploads for lecture materials  

### ⚙ **Infrastructure & Performance**
- Redis caching layer  
- Cache invalidation strategy  
- Winston logging with daily rotation  
- Correlation ID per request  
- Health check endpoint  
- Swagger API documentation  
- Clean modular architecture  

### 🧪 **Testing Suite**
- Jest + Supertest  
- Mocked Redis  
- Mocked Email  
- Mocked Auth  
- Mocked Network  
- Full CRUD tests for:
  - Auth  
  - Sessions  
  - Users  
  - Doctors  
  - Subjects  
  - Semesters  
  - Years  
  - Saved lectures  
  - Lectures  

---

## 🚀 Installation Guide

### **Prerequisites**
Make sure you have:

- Node.js (v20+ recommended)  
- npm or Yarn  
- MongoDB (local or Atlas)  
- Redis (local or cloud)

---

### **1. Clone the Repository**

```bash
git clone <repo-url>
cd TIC_Academy_Backend

```

### **2. Install Dependencies**

```bash
npm install
```

### **3. Environment Configuration**

Create a `.env` file in the root directory and fill it with your environment variables:

```env
PORT=8000
NODE_ENV=development

DB_URI=your_mongodb_connection_string

JWT_SECRET=your_access_token_secret
JWT_EXPIRES_IN=30m

JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_REFRESH_EXPIRES_IN=30d
JWT_REFRESH_EXPIRES_IN_DAYS=30

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your_email
EMAIL_PASSWORD=your_email_password

PRIVATE_KEY=uuid_value
```
### **4. Start the Server**

#### **Development Mode**
```bash
npm run start:dev
```
#### **Production Mode**
``` bash 
npm run start
```
#### **Test Mode**
```bash
npm test
```

## 📘 API Documentation

Swagger UI is available at:

```bash
http://localhost:8000/api-docs
```

This includes full documentation for:

- Authentication  
- Users  
- Doctors  
- Subjects  
- Semesters  
- Years  
- Lectures  
- Saved Lectures  
- Sessions  

---

## 💡 Usage Examples

### **Register a New User**
**POST** `/api/v1/auth/signup`

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPass@123!",
  "passwordConfirm": "StrongPass@123!"
}
```
### **Fetch All Subjects**
**GET** `/api/v1/subjects`

Supports filtering, sorting, and pagination.

---

### **Refresh Access Token**
**POST** `/api/v1/auth/refresh`

Automatically rotates refresh tokens and creates a new session.

---

## 🗺️ Project Roadmap

### **V1.1 – Instructor Dashboard**
- Manage lectures  
- View student progress  
- Analytics  

### **V1.2 – Interactive Quizzes**
- MCQ quizzes  
- Auto‑grading  
- Student progress tracking  

### **V1.3 – Real‑time Communication**
- Chat  
- Forums  
- Notifications  

### **V1.4 – Advanced Search**
- Full‑text search  
- Smart filters  
- Recommendations  

### **V1.5 – Multi‑Language Expansion**
- Full i18n support  
- Admin panel localization  
---

## 🤝 Contribution Guidelines

We welcome contributions! Please follow these rules:

### **Code Style**
- Follow the ESLint rules (`.eslintrc.json`)
- Use consistent naming and formatting

### **Branch Naming**
- `feature/add-lecture-upload`
- `bugfix/fix-refresh-token`
- `refactor/improve-logging`

### **Pull Requests**
1. Fork the repo  
2. Create a feature branch  
3. Write clear and descriptive commit messages  
4. Ensure all tests pass before submitting  
5. Provide a detailed explanation of your changes in the PR description  

### **Testing Requirements**
- All new features must include appropriate tests  
- All existing tests must pass before merging  

---

## 📄 License

This project is currently **unlicensed**.  
All rights are reserved by the author **(BasharBallan)**.  
Usage, distribution, or modification of this project requires explicit permission.

