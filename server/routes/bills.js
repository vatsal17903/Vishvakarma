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

// Generate bill number
function generateBillNumber(companyCode) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    const lastBill = db.prepare(`
    SELECT bill_number FROM bills 
    WHERE bill_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`INV/${companyCode}/${year}${month}%`);

    let sequence = 1;
    if (lastBill) {
        const parts = lastBill.bill_number.split('/');
        sequence = parseInt(parts[parts.length - 1]) + 1;
    }

    return `INV/${companyCode}/${year}${month}/${sequence.toString().padStart(4, '0')}`;
}

// Get all bills for current company
router.get('/', requireCompany, (req, res) => {
    try {
        const bills = db.prepare(`
      SELECT b.*, q.quotation_number, c.name as client_name
      FROM bills b
      LEFT JOIN quotations q ON b.quotation_id = q.id
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE b.company_id = ?
      ORDER BY b.created_at DESC
    `).all(req.session.companyId);
        res.json(bills);
    } catch (error) {
        console.error('Get bills error:', error);
        res.status(500).json({ error: 'Failed to fetch bills' });
    }
});

// Get recent bills
router.get('/recent', requireCompany, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const bills = db.prepare(`
      SELECT b.*, q.quotation_number, c.name as client_name
      FROM bills b
      LEFT JOIN quotations q ON b.quotation_id = q.id
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE b.company_id = ?
      ORDER BY b.created_at DESC
      LIMIT ?
    `).all(req.session.companyId, limit);
        res.json(bills);
    } catch (error) {
        console.error('Get recent bills error:', error);
        res.status(500).json({ error: 'Failed to fetch recent bills' });
    }
});

// Get single bill
router.get('/:id', requireCompany, (req, res) => {
    try {
        const bill = db.prepare(`
      SELECT b.*, q.quotation_number, q.total_sqft, q.rate_per_sqft, q.bedroom_count, q.bedroom_config,
             c.name as client_name, c.address as client_address, c.phone as client_phone, c.project_location
      FROM bills b
      LEFT JOIN quotations q ON b.quotation_id = q.id
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE b.id = ? AND b.company_id = ?
    `).get(req.params.id, req.session.companyId);

        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        // Get quotation items
        const items = db.prepare(`
      SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order
    `).all(bill.quotation_id);

        // Get receipts
        const receipts = db.prepare(`
      SELECT * FROM receipts WHERE quotation_id = ? ORDER BY date
    `).all(bill.quotation_id);

        res.json({ ...bill, items, receipts });
    } catch (error) {
        console.error('Get bill error:', error);
        res.status(500).json({ error: 'Failed to fetch bill' });
    }
});

// Create bill from quotation
router.post('/', requireCompany, (req, res) => {
    try {
        const { quotation_id, date, notes } = req.body;

        // Check if bill already exists for quotation
        const existingBill = db.prepare('SELECT * FROM bills WHERE quotation_id = ?').get(quotation_id);
        if (existingBill) {
            return res.status(400).json({ error: 'Bill already exists for this quotation' });
        }

        // Get quotation
        const quotation = db.prepare(`
      SELECT * FROM quotations WHERE id = ? AND company_id = ?
    `).get(quotation_id, req.session.companyId);

        if (!quotation) {
            return res.status(404).json({ error: 'Quotation not found' });
        }

        // Calculate paid amount from receipts
        const receiptsTotal = db.prepare('SELECT SUM(amount) as total FROM receipts WHERE quotation_id = ?').get(quotation_id);
        const paid_amount = receiptsTotal.total || 0;
        const balance_amount = quotation.grand_total - paid_amount;

        let status = 'pending';
        if (balance_amount <= 0) {
            status = 'paid';
        } else if (paid_amount > 0) {
            status = 'partial';
        }

        // Generate bill number
        const bill_number = generateBillNumber(req.session.companyCode);

        const result = db.prepare(`
      INSERT INTO bills (
        company_id, quotation_id, bill_number, date, subtotal,
        cgst_percent, cgst_amount, sgst_percent, sgst_amount, total_tax,
        grand_total, paid_amount, balance_amount, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            req.session.companyId, quotation_id, bill_number, date || new Date().toISOString().split('T')[0],
            quotation.taxable_amount, quotation.cgst_percent, quotation.cgst_amount,
            quotation.sgst_percent, quotation.sgst_amount, quotation.total_tax,
            quotation.grand_total, paid_amount, balance_amount, status, notes
        );

        // Update quotation status
        db.prepare('UPDATE quotations SET status = ? WHERE id = ?').run('billed', quotation_id);

        const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(bill);
    } catch (error) {
        console.error('Create bill error:', error);
        res.status(500).json({ error: 'Failed to create bill' });
    }
});

// Update bill
router.put('/:id', requireCompany, (req, res) => {
    try {
        const { date, notes } = req.body;

        db.prepare(`
      UPDATE bills SET date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ?
    `).run(date, notes, req.params.id, req.session.companyId);

        const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
        res.json(bill);
    } catch (error) {
        console.error('Update bill error:', error);
        res.status(500).json({ error: 'Failed to update bill' });
    }
});

// Delete bill
router.delete('/:id', requireCompany, (req, res) => {
    try {
        const bill = db.prepare('SELECT * FROM bills WHERE id = ? AND company_id = ?').get(req.params.id, req.session.companyId);

        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        db.prepare('DELETE FROM bills WHERE id = ?').run(req.params.id);

        // Update quotation status back to confirmed
        db.prepare('UPDATE quotations SET status = ? WHERE id = ?').run('confirmed', bill.quotation_id);

        res.json({ success: true, message: 'Bill deleted successfully' });
    } catch (error) {
        console.error('Delete bill error:', error);
        res.status(500).json({ error: 'Failed to delete bill' });
    }
});

export default router;
