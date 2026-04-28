# 🚀 CodePath LMS — Full Stack Learning Platform

A complete LeetCode + Coursera-style LMS with Monaco editor, Judge0 code execution, and activity heatmaps.

## 🗂️ Project Structure

```
lms-platform/
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   ├── middleware/auth.js
│   ├── models/
│   ├── routes/
│   ├── seed/seed.js
│   ├── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/Layout.jsx
    │   ├── context/AuthContext.jsx
    │   ├── pages/
    │   ├── utils/api.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

## ⚙️ Setup Instructions

### 1. Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`)
- (Optional) Judge0 RapidAPI key for live code execution

### 2. Backend Setup

```bash
cd lms-platform/backend
npm install

# Create your .env file
cp .env.example .env
# Edit .env:
#   MONGO_URI=mongodb://localhost:27017/lms-platform
#   JWT_SECRET=your_secret_key_here
#   JUDGE0_API_KEY=your_rapidapi_key   ← optional
#   JUDGE0_URL=https://judge0-ce.p.rapidapi.com

# Seed the database
npm run seed

# Start the backend
npm run dev
# → Running on http://localhost:5000
```

### 3. Frontend Setup

```bash
cd lms-platform/frontend
npm install
npm run dev
# → Running on http://localhost:5173
```

### 4. Open in browser
Navigate to **http://localhost:5173**, sign up, and start coding!

---

## 🔑 Judge0 Setup (for live code execution)

1. Go to https://rapidapi.com/judge0-official/api/judge0-ce
2. Subscribe to the free plan
3. Copy your API key
4. Add to backend `.env`:
   ```
   JUDGE0_API_KEY=your_key_here
   JUDGE0_URL=https://judge0-ce.p.rapidapi.com
   ```

Without a Judge0 key, the Run button will still work for HTML/CSS (preview mode), and all submissions will return a mock "Accepted" result.

---

## 🎓 Courses & Content

| Course | Language | Topics | Problems |
|--------|----------|--------|----------|
| Web Development | HTML, CSS, JavaScript | 6 | 18 |
| DSA | Java, C++, Python | 6 | 18 |
| DevOps | Bash, YAML | 6 | 18 |
| AI/ML | Python | 6 | 18 |

## 📦 Tech Stack

**Frontend:** React + Vite + Tailwind CSS + Framer Motion + Monaco Editor  
**Backend:** Node.js + Express + MongoDB (Mongoose)  
**Auth:** JWT + bcrypt  
**Code Execution:** Judge0 API
