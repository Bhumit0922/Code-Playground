# ⚡ Code Playground - Online Coding & Contest Platform

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/express-4.21.2-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/mongodb-mongoose-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/license-ISC-orange.svg)](LICENSE)

**Code Playground** is a modern, high-performance competitive programming and coding practice platform. It features an in-browser Monaco code editor (the engine behind VS Code), sandboxed multi-language cloud execution (Python, C++, Java, C), automated test case verification, real-time timed contests, dynamic leaderboards, rating calculations, and community discussion forums.

---

## 🚀 Key Features

- 💻 **Monaco Code Editor**: Professional in-browser code editor with syntax highlighting, automatic indentation, tab switching, and custom stdin input support.
- ⚡ **Sandboxed Cloud Code Execution**: Dual-mode execution engine powered by the isolated **Piston API** for cloud and serverless deployments (Vercel, Render, Railway, AWS) with local compiler fallback.
- 🏆 **Real-Time Coding Contests**: Host public or private challenges with unique invite codes, live scoreboards, and automated rating progressions.
- 📊 **Dynamic Leaderboard & Ratings**: Real-time ranking based on problem point values and submission time penalties.
- 📚 **Comprehensive Problem Bank**: Filter problems by difficulty (*Easy*, *Medium*, *Hard*), algorithmic topic (*Arrays*, *DP*, *Two Pointers*, *Searching*), and sort by acceptance rate.
- 💬 **Community Discussion Forum**: Interactive forum with tag filtering, voting, and solution discussions.
- 📱 **100% Mobile Responsive**: Glassmorphism navbar with a smooth mobile slide-out drawer, mobile split-pane editor, and responsive data tables.
- 🔐 **Secure JWT Authentication**: Role-based access control (`user` vs `admin`) with salted passwords and session persistence.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Frontend / Templating**: EJS (Embedded JavaScript), Vanilla CSS, Poppins Typography, FontAwesome
- **Code Execution**: Monaco Editor CDN + Sandboxed Piston API / Local GCC & JDK
- **Authentication**: JWT (JSON Web Tokens), BCrypt.js
- **Deployment**: Docker, Docker Compose, Vercel Serverless, Render, Railway

---

## 📦 Project Structure

```
Code-Playground/
├── backend/
│   ├── config/
│   │   └── db.js                 # Database connection with graceful retry
│   ├── middleware/
│   │   └── auth.js               # JWT verification & admin role check
│   ├── models/
│   │   ├── Comment.js            # Forum comments schema
│   │   ├── Contact.js            # Contact inquiries schema
│   │   ├── Contest.js            # Contest details & leaderboard schema
│   │   ├── Discussion.js         # Forum discussions schema
│   │   ├── Problem.js            # Algorithmic problems & test cases
│   │   └── User.js               # User accounts, ratings & history
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth (login, register, profile)
│   │   ├── contactRoutes.js      # /api/contact (feedback & contact form)
│   │   ├── contestRoutes.js      # /api/contests (create, join, list)
│   │   ├── contestjoinRoutes.js  # /api/contests/join
│   │   ├── discussRoutes.js      # /api/discuss (posts, tags, comments)
│   │   ├── executeRoutes.js      # /api/execute (run, test against cases)
│   │   └── problemRoutes.js      # /api/problems (crud, search, submit)
│   ├── utils/
│   │   ├── contestService.js     # Leaderboard calculation & rating logic
│   │   └── executeCode.js        # Dual-mode execution engine (Piston + Local)
│   ├── index.js                  # Main server entry & page routes
│   └── seed.js                   # Database seeder (problems, contests, users)
├── frontend/
│   ├── css/
│   │   ├── common.css            # Universal variables, navbar, footer & badges
│   │   └── ...                   # Page-specific styles
│   ├── imgg/                     # Platform logos, favicons, avatars
│   └── views/
│       ├── partials/             # Shared head, navbar, and footer components
│       ├── about.ejs             # About platform page
│       ├── contestpage.ejs       # Contest arena with live chart
│       ├── contests.ejs          # Contests directory & join by code
│       ├── create_contest.ejs    # Contest creator wizard
│       ├── editcode.ejs          # Monaco editor problem workspace
│       ├── error.ejs             # Unified error page
│       ├── explore.ejs           # Topic explorer & featured problems
│       ├── home.ejs              # Hero landing page
│       ├── leaderboard.ejs       # Contest standings
│       ├── problems.ejs          # Problem bank with filter bar
│       ├── profile.ejs           # User profile & stats
│       ├── signin.ejs            # Authentication (Sign In)
│       └── signup.ejs            # Authentication (Sign Up)
├── .env.example                  # Environment configuration template
├── docker-compose.yml            # Local 1-click orchestration (App + Mongo)
├── Dockerfile                    # Production container build
├── package.json
└── vercel.json                   # Vercel serverless deployment config
```

---

## 🏃 Local Setup & Development

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [MongoDB](https://www.mongodb.com/) (running locally or MongoDB Atlas URI)

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/Bhumit0922/Code-Playground.git
cd Code-Playground
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` as needed:
```env
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/codeplayground
JWT_SECRET=your_super_secret_jwt_key
EXECUTION_MODE=cloud
PISTON_API_URL=https://emkc.org/api/v2/piston/execute
```

### 4. Seed the Database
Populate 8+ standard algorithmic problems (Two Sum, Valid Parentheses, Binary Search, etc.), sample upcoming/ongoing contests, and default demo accounts:
```bash
npm run seed
```

Default seeded credentials:
- **Admin Account**: `admin@codeplayground.com` / `Admin@123`
- **Student Account 1**: `alex@codeplayground.com` / `User@123`
- **Student Account 2**: `sarah@codeplayground.com` / `User@123`

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:4000](http://localhost:4000) in your browser.

---

## 🐳 Docker Setup

Run the complete platform and MongoDB with a single command:
```bash
docker-compose up --build
```
Access the application at [http://localhost:4000](http://localhost:4000).

---

## 🌐 Production Deployment Guide

### Option 1: Deploy on Vercel
1. Fork or push your code to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Under **Environment Variables**, add:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `JWT_SECRET`: A secure random string.
   - `EXECUTION_MODE`: `cloud`
4. Click **Deploy**. Vercel uses `vercel.json` to route SSR requests through `@vercel/node`.

### Option 2: Deploy on Render / Railway
1. Create a new **Web Service** on [Render](https://render.com) or [Railway](https://railway.app).
2. Connect your GitHub repository:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. Add environment variables:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: Your MongoDB connection URI.
   - `JWT_SECRET`: Your secret key.
   - `EXECUTION_MODE`: `cloud`
4. Deploy service!

---

## 🤝 Contributing

Contributions are always welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
Distributed under the ISC License. See `LICENSE` for more information.
