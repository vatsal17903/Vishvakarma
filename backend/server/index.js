import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './database/init.js';
import authRoutes from './routes/auth.js';
import companyRoutes from './routes/company.js';
import clientRoutes from './routes/clients.js';
import packageRoutes from './routes/packages.js';
import quotationRoutes from './routes/quotations.js';
import receiptRoutes from './routes/receipts.js';
import billRoutes from './routes/bills.js';
import reportRoutes from './routes/reports.js';
import pdfRoutes from './routes/pdf.js';
import sqftDefaultsRoutes from './routes/sqft-defaults.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session management
app.use(session({
    secret: 'crm-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize database
await initializeDatabase();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/sqft-defaults', sqftDefaultsRoutes);

// Serve static files in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Handle SPA routing
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 API available at http://localhost:${PORT}/api`);
});
