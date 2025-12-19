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

// Get all packages for current company
router.get('/', requireCompany, (req, res) => {
    try {
        const packages = db.prepare(`
      SELECT * FROM packages 
      WHERE company_id = ? AND is_active = 1
      ORDER BY tier, bhk_type
    `).all(req.session.companyId);
        res.json(packages);
    } catch (error) {
        console.error('Get packages error:', error);
        res.status(500).json({ error: 'Failed to fetch packages' });
    }
});

// Get package with items
router.get('/:id', requireCompany, (req, res) => {
    try {
        const pkg = db.prepare(`
      SELECT * FROM packages 
      WHERE id = ? AND company_id = ?
    `).get(req.params.id, req.session.companyId);

        if (!pkg) {
            return res.status(404).json({ error: 'Package not found' });
        }

        const items = db.prepare(`
      SELECT * FROM package_items 
      WHERE package_id = ?
      ORDER BY sort_order, id
    `).all(req.params.id);

        res.json({ ...pkg, items });
    } catch (error) {
        console.error('Get package error:', error);
        res.status(500).json({ error: 'Failed to fetch package' });
    }
});

// Create package
router.post('/', requireCompany, (req, res) => {
    try {
        const { name, bhk_type, tier, base_rate_sqft, description, items } = req.body;

        const result = db.prepare(`
      INSERT INTO packages (company_id, name, bhk_type, tier, base_rate_sqft, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.session.companyId, name, bhk_type, tier, base_rate_sqft, description);

        const packageId = result.lastInsertRowid;

        // Insert items
        if (items && items.length > 0) {
            const insertItem = db.prepare(`
        INSERT INTO package_items (package_id, item_name, description, unit, sq_foot, quantity, rate, amount, room_type, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

            items.forEach((item, index) => {
                insertItem.run(packageId, item.item_name, item.description, item.unit, item.sq_foot, item.quantity, item.rate, item.amount, item.room_type, index);
            });
        }

        const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(packageId);
        res.status(201).json(pkg);
    } catch (error) {
        console.error('Create package error:', error);
        res.status(500).json({ error: 'Failed to create package' });
    }
});

// Update package
router.put('/:id', requireCompany, (req, res) => {
    try {
        const { name, bhk_type, tier, base_rate_sqft, description, items } = req.body;

        db.prepare(`
      UPDATE packages 
      SET name = ?, bhk_type = ?, tier = ?, base_rate_sqft = ?, description = ?
      WHERE id = ? AND company_id = ?
    `).run(name, bhk_type, tier, base_rate_sqft, description, req.params.id, req.session.companyId);

        // Update items
        if (items) {
            db.prepare('DELETE FROM package_items WHERE package_id = ?').run(req.params.id);

            const insertItem = db.prepare(`
        INSERT INTO package_items (package_id, item_name, description, unit, sq_foot, quantity, rate, amount, room_type, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

            items.forEach((item, index) => {
                insertItem.run(req.params.id, item.item_name, item.description, item.unit, item.sq_foot, item.quantity, item.rate, item.amount, item.room_type, index);
            });
        }

        const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
        res.json(pkg);
    } catch (error) {
        console.error('Update package error:', error);
        res.status(500).json({ error: 'Failed to update package' });
    }
});

// Delete package (soft delete)
router.delete('/:id', requireCompany, (req, res) => {
    try {
        db.prepare('UPDATE packages SET is_active = 0 WHERE id = ? AND company_id = ?').run(req.params.id, req.session.companyId);
        res.json({ success: true, message: 'Package deleted successfully' });
    } catch (error) {
        console.error('Delete package error:', error);
        res.status(500).json({ error: 'Failed to delete package' });
    }
});

// Get packages by tier
router.get('/tier/:tier', requireCompany, (req, res) => {
    try {
        const packages = db.prepare(`
      SELECT * FROM packages 
      WHERE company_id = ? AND tier = ? AND is_active = 1
      ORDER BY bhk_type
    `).all(req.session.companyId, req.params.tier);
        res.json(packages);
    } catch (error) {
        console.error('Get packages by tier error:', error);
        res.status(500).json({ error: 'Failed to fetch packages' });
    }
});

export default router;
