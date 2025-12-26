# Vishvakarma - CRM for Construction & Interior Business

A full-stack CRM application built with React (frontend) and Express.js (backend) for managing construction and interior business operations.

## ⚡ Quick Start

**For experienced developers who want to get started immediately:**

```bash
# 1. Create MySQL database
mysql -u root -p
CREATE DATABASE vishvakara;
exit;

# 2. Configure backend/.env with your MySQL credentials

# 3. Install backend dependencies
cd backend
npm install

# 4. Install frontend dependencies
cd ../frontend
npm install

# 5. Start backend (Terminal 1)
cd backend
npm run dev

# 6. Start frontend (Terminal 2)
cd frontend
npm run dev

# 7. Open http://localhost:5173
# Login: admin / admin123
```

**For detailed setup instructions, see the [Complete Setup Guide](#-complete-setup-guide) below.**

## 📁 Project Structure

```
Vishvakarma/
├── backend/          # Express.js backend API
│   ├── server/       # Server code
│   │   ├── index.js     # Main server file
│   │   ├── routes/      # API route handlers
│   │   ├── database/    # Database configuration
│   │   └── *.js         # Migration and utility scripts
│   ├── .env             # Environment variables (not in git)
│   ├── package.json     # Backend dependencies
│   ├── START.md         # Quick start guide
│   └── node_modules/    # Backend dependencies (installed)
│
├── frontend/         # React + Vite frontend application
│   ├── src/          # React components, pages, and context
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context providers
│   │   ├── App.jsx      # Main app component
│   │   ├── main.jsx     # Entry point
│   │   └── index.css    # Global styles
│   ├── index.html       # HTML entry point
│   ├── vite.config.js   # Vite configuration
│   ├── package.json     # Frontend dependencies
│   ├── START.md         # Quick start guide
│   └── node_modules/    # Frontend dependencies (installed)
│
├── .git/             # Git version control
├── .gitignore        # Git ignore rules
└── README.md         # This file - Complete documentation
```

## 🚀 Complete Setup Guide

Follow these steps to set up and run the project from scratch:

### **Step 1: Prerequisites**

Make sure you have the following installed on your system:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **MySQL** (v5.7 or higher) - [Download here](https://dev.mysql.com/downloads/mysql/)
- **Git** (optional, for cloning)

Verify installations:
```bash
node --version   # Should show v16.x.x or higher
npm --version    # Should show 8.x.x or higher
mysql --version  # Should show MySQL version
```

### **Step 2: Clone or Download the Project**

```bash
# If using Git
git clone <repository-url>
cd Vishvakarma

# Or download and extract the ZIP file, then navigate to the folder
cd Vishvakarma
```

### **Step 3: Database Setup**

#### 3.1 Create MySQL Database

Open your MySQL client (MySQL Workbench, command line, or any other tool) and run:

```sql
CREATE DATABASE vishvakara;
```

**Note:** The database name must be exactly `vishvakara` (or update the `.env` file accordingly).

#### 3.2 Configure Database Connection

The backend already has a `.env` file. Verify or update it with your MySQL credentials:

**Location:** `backend/.env`

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=vishvakara
PORT=3006
SESSION_SECRET=your-secret-key-here
```

**Important:** Replace `your_mysql_password` with your actual MySQL root password.

### **Step 4: Install Dependencies**

Install dependencies for both backend and frontend from their respective directories.

#### 4.1 Install Backend Dependencies

Navigate to the backend directory and install:

```bash
cd backend
npm install
```

This will install all backend dependencies (Express, MySQL2, bcryptjs, etc.)

You should see output like:
```
added XXX packages, and audited XXX packages in Xs
found 0 vulnerabilities
```

#### 4.2 Install Frontend Dependencies

Navigate to the frontend directory and install:

```bash
cd frontend
npm install
```

This will install all frontend dependencies (React, Vite, React Router, etc.)

You should see output like:
```
added XXX packages, and audited XXX packages in Xs
found 0 vulnerabilities
```

### **Step 5: Start the Application**

You need to start both the backend and frontend servers. Open **two separate terminals**.

#### **Terminal 1 - Start Backend Server**

Navigate to the backend directory and start the server:

```bash
cd backend
npm run dev
```

You should see:
```
✅ MySQL Database initialized successfully
🚀 Server running on http://localhost:3006
📁 API available at http://localhost:3006/api
```

#### **Terminal 2 - Start Frontend Server**

Navigate to the frontend directory and start the development server:

```bash
cd frontend
npm run dev
```

You should see:
```
VITE v6.4.1  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.53:5173/
```

### **Step 6: Access the Application**

Once both servers are running, open your browser and navigate to:

🌐 **Frontend:** [http://localhost:5173](http://localhost:5173)

The frontend will automatically proxy API requests to the backend at `http://localhost:3006/api`

### **Step 7: Login**

Use the default admin credentials:

- **Username:** `admin`
- **Password:** `admin123`

**Note:** These credentials are automatically created when the database is initialized on first run.

## 📋 Available Scripts

### **Backend Scripts** (Run from `backend/` directory)

```bash
cd backend
```

| Command | Description |
|---------|-------------|
| `npm install` | Install backend dependencies |
| `npm run dev` | Start backend development server |
| `npm start` | Start backend in production mode |

### **Frontend Scripts** (Run from `frontend/` directory)

```bash
cd frontend
```

| Command | Description |
|---------|-------------|
| `npm install` | Install frontend dependencies |
| `npm run dev` | Start frontend development server |
| `npm run build` | Build frontend for production |
| `npm run preview` | Preview production build locally |

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **React Router DOM** - Client-side routing
- **Vite** - Build tool and dev server
- **Vanilla CSS** - Styling

### Backend
- **Express.js** - Web framework
- **MySQL2** - Database driver
- **bcryptjs** - Password hashing
- **express-session** - Session management
- **dotenv** - Environment variable management
- **PDFKit** - PDF generation
- **UUID** - Unique ID generation
- **CORS** - Cross-origin resource sharing

## 🔧 Configuration

### Frontend Configuration

**File:** `frontend/vite.config.js`

The Vite config includes:
- React plugin
- Development server on port 5173
- API proxy to backend (http://localhost:3006)
- Network exposure for local network access

### Backend Configuration

**File:** `backend/.env`

Environment variables:
- `DB_HOST` - MySQL host (default: localhost)
- `DB_USER` - MySQL username (default: root)
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - Database name (default: vishvakara)
- `PORT` - Backend server port (default: 3006)
- `SESSION_SECRET` - Secret key for session encryption

## 🗄️ Database

The application uses MySQL database. On first run, the backend will automatically:

1. Create necessary tables
2. Add required columns
3. Create default admin user (username: `admin`, password: `admin123`)
4. Populate default companies and packages

**Database Name:** `vishvakara`

## 🚨 Troubleshooting

### Issue: "Unknown database 'vishvakara'"

**Solution:** Create the database in MySQL:
```sql
CREATE DATABASE vishvakara;
```

### Issue: "Access denied for user 'root'@'localhost'"

**Solution:** Check your MySQL credentials in `backend/.env` and ensure they are correct.

### Issue: "Port 3006 already in use"

**Solution:** Either:
1. Stop the process using port 3006, or
2. Change the `PORT` in `backend/.env` to another port (e.g., 3007)

### Issue: "Port 5173 already in use"

**Solution:** Vite will automatically try the next available port (5174, 5175, etc.)

### Issue: Frontend can't connect to backend

**Solution:** 
1. Ensure backend is running on port 3006
2. Check the proxy configuration in `frontend/vite.config.js`
3. Verify CORS is enabled in backend

### Issue: Dependencies installation fails

**Solution:**
1. Clear npm cache: `npm cache clean --force`
2. Delete all `node_modules` folders and `package-lock.json` files
3. Run `npm install` again

## 📝 Development Workflow

### **Recommended Setup**

For the best development experience, use **two separate terminal windows/tabs**:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Keep this running. The backend will restart automatically if you make changes (you may need to use nodemon for auto-restart).

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Keep this running. Vite will hot-reload automatically when you make changes.

### **Making Changes**

#### Frontend Changes
1. Navigate to `frontend/src/`
2. Edit your React components, pages, or styles
3. Save the file
4. Vite will automatically hot-reload the browser ✨

#### Backend Changes
1. Navigate to `backend/server/`
2. Edit your routes, database logic, or server configuration
3. Save the file
4. Manually restart the backend server (or use nodemon for auto-restart)

### **Adding New Dependencies**

#### Add Frontend Dependency
```bash
cd frontend
npm install <package-name>
```

#### Add Backend Dependency
```bash
cd backend
npm install <package-name>
```

### **Working Directory Structure**

When developing, you'll primarily work in these directories:

```
frontend/src/
├── components/    # Reusable UI components
├── pages/        # Page components (routes)
├── context/      # React context providers
├── App.jsx       # Main app component
├── main.jsx      # Entry point
└── index.css     # Global styles

backend/server/
├── routes/       # API route handlers
├── database/     # Database configuration
└── index.js      # Main server file
```

## 🏗️ Building for Production

### Build Frontend

Navigate to the frontend directory and build:

```bash
cd frontend
npm run build
```

This creates an optimized production build in `frontend/dist/`

### Start Backend in Production

Navigate to the backend directory and start:

```bash
cd backend
npm start
```

This starts the backend server in production mode.

## 📦 Project Features

- User authentication and session management
- Company management
- Package management
- Master creation workflow
- Exam entry and notifications
- Student-wise data management
- PDF generation and export
- Responsive design

## 🔐 Security Notes

- Change the default admin password after first login
- Update `SESSION_SECRET` in `backend/.env` with a strong random string
- Never commit `.env` files to version control
- Use environment-specific `.env` files for different environments

## 📄 License

ISC

## 👥 Support

For issues or questions, please contact the development team or create an issue in the repository.

---

**Happy Coding! 🚀**
