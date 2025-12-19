import express from 'express';
import { db } from '../database/init.js';

const router = express.Router();

// Middleware to check company selection
const requireCompany = (req, res, next) => {
    if (!req.session.companyId) {
        return res.status(400).json({ error: 'Please select a company first' });
    }
    next();
};

// Get all clients for current company
router.get('/', requireCompany, (req, res) => {
    try {
        const clients = db.prepare(`
      SELECT * FROM clients 
      WHERE company_id = ? 
      ORDER BY created_at DESC
    `).all(req.session.companyId);
        res.json(clients);
    } catch (error) {
        console.error('Get clients error:', error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

// Get single client
router.get('/:id', requireCompany, (req, res) => {
    try {
        const client = db.prepare(`
      SELECT * FROM clients 
      WHERE id = ? AND company_id = ?
    `).get(req.params.id, req.session.companyId);

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json(client);
    } catch (error) {
        console.error('Get client error:', error);
        res.status(500).json({ error: 'Failed to fetch client' });
    }
});

// Create client
router.post('/', requireCompany, (req, res) => {
    try {
        const { name, address, phone, email, project_location, notes } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Client name is required' });
        }

        const result = db.prepare(`
      INSERT INTO clients (company_id, name, address, phone, email, project_location, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.session.companyId, name, address, phone, email, project_location, notes);

        const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(client);
    } catch (error) {
        console.error('Create client error:', error);
        res.status(500).json({ error: 'Failed to create client' });
    }
});

// Update client
router.put('/:id', requireCompany, (req, res) => {
    try {
        const { name, address, phone, email, project_location, notes } = req.body;

        db.prepare(`
      UPDATE clients 
      SET name = ?, address = ?, phone = ?, email = ?, project_location = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ?
    `).run(name, address, phone, email, project_location, notes, req.params.id, req.session.companyId);

        const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
        res.json(client);
    } catch (error) {
        console.error('Update client error:', error);
        res.status(500).json({ error: 'Failed to update client' });
    }
});

// Delete client
router.delete('/:id', requireCompany, (req, res) => {
    try {
        // Check if client has quotations
        const quotations = db.prepare('SELECT COUNT(*) as count FROM quotations WHERE client_id = ?').get(req.params.id);

        if (quotations.count > 0) {
            return res.status(400).json({ error: 'Cannot delete client with existing quotations' });
        }

        db.prepare('DELETE FROM clients WHERE id = ? AND company_id = ?').run(req.params.id, req.session.companyId);
        res.json({ success: true, message: 'Client deleted successfully' });
    } catch (error) {
        console.error('Delete client error:', error);
        res.status(500).json({ error: 'Failed to delete client' });
    }
});

// Search clients
router.get('/search/:query', requireCompany, (req, res) => {
    try {
        const query = `%${req.params.query}%`;
        const clients = db.prepare(`
      SELECT * FROM clients 
      WHERE company_id = ? AND (name LIKE ? OR phone LIKE ? OR project_location LIKE ?)
      ORDER BY name
      LIMIT 20
    `).all(req.session.companyId, query, query, query);
        res.json(clients);
    } catch (error) {
        console.error('Search clients error:', error);
        res.status(500).json({ error: 'Failed to search clients' });
    }
});

export default router;
