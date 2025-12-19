import express from 'express';
import { db } from '../database/init.js';

const router = express.Router();

// Get all companies
router.get('/', (req, res) => {
    try {
        const companies = db.prepare('SELECT * FROM companies').all();
        res.json(companies);
    } catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});

// Select company (set in session)
router.post('/select', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { companyId } = req.body;

        const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);

        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        req.session.companyId = company.id;
        req.session.companyName = company.name;
        req.session.companyCode = company.code;

        res.json({
            success: true,
            company: {
                id: company.id,
                name: company.name,
                code: company.code
            }
        });
    } catch (error) {
        console.error('Select company error:', error);
        res.status(500).json({ error: 'Failed to select company' });
    }
});

// Get current company
router.get('/current', (req, res) => {
    try {
        if (!req.session.companyId) {
            return res.json({ company: null });
        }

        const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.session.companyId);
        res.json({ company });
    } catch (error) {
        console.error('Get current company error:', error);
        res.status(500).json({ error: 'Failed to fetch current company' });
    }
});

// Update company details
router.put('/:id', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { id } = req.params;
        const { name, address, phone, email, gst_number } = req.body;

        db.prepare(`
      UPDATE companies 
      SET name = ?, address = ?, phone = ?, email = ?, gst_number = ?
      WHERE id = ?
    `).run(name, address, phone, email, gst_number, id);

        const updated = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
        res.json(updated);
    } catch (error) {
        console.error('Update company error:', error);
        res.status(500).json({ error: 'Failed to update company' });
    }
});

export default router;
