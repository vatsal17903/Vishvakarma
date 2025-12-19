import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database/init.js';

const router = express.Router();

// Login
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = bcrypt.compareSync(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Set session - but DON'T set company (user must select each time)
        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.companyId = null; // Force company selection every login

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name
            },
            requireCompanySelection: true
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Check session
router.get('/session', (req, res) => {
    if (req.session.userId) {
        res.json({
            authenticated: true,
            user: {
                id: req.session.userId,
                name: req.session.userName
            },
            companyId: req.session.companyId,
            companyName: req.session.companyName
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Change password
router.post('/change-password', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { currentPassword, newPassword } = req.body;

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

        if (!bcrypt.compareSync(currentPassword, user.password)) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.session.userId);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

export default router;
