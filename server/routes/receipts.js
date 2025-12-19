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

// Generate receipt number
function generateReceiptNumber(companyCode) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    const lastReceipt = db.prepare(`
    SELECT receipt_number FROM receipts 
    WHERE receipt_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`RCP/${companyCode}/${year}${month}%`);

    let sequence = 1;
    if (lastReceipt) {
        const parts = lastReceipt.receipt_number.split('/');
        sequence = parseInt(parts[parts.length - 1]) + 1;
    }

    return `RCP/${companyCode}/${year}${month}/${sequence.toString().padStart(4, '0')}`;
}

// Get all receipts for current company
router.get('/', requireCompany, (req, res) => {
    try {
        const receipts = db.prepare(`
      SELECT r.*, q.quotation_number, c.name as client_name
      FROM receipts r
      LEFT JOIN quotations q ON r.quotation_id = q.id
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE r.company_id = ?
      ORDER BY r.created_at DESC
    `).all(req.session.companyId);
        res.json(receipts);
    } catch (error) {
        console.error('Get receipts error:', error);
        res.status(500).json({ error: 'Failed to fetch receipts' });
    }
});

// Get recent receipts
router.get('/recent', requireCompany, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const receipts = db.prepare(`
      SELECT r.*, q.quotation_number, c.name as client_name
      FROM receipts r
      LEFT JOIN quotations q ON r.quotation_id = q.id
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE r.company_id = ?
      ORDER BY r.created_at DESC
      LIMIT ?
    `).all(req.session.companyId, limit);
        res.json(receipts);
    } catch (error) {
        console.error('Get recent receipts error:', error);
        res.status(500).json({ error: 'Failed to fetch recent receipts' });
    }
});

// Get receipts by quotation
router.get('/quotation/:quotationId', requireCompany, (req, res) => {
    try {
        const receipts = db.prepare(`
      SELECT * FROM receipts 
      WHERE quotation_id = ? AND company_id = ?
      ORDER BY date DESC
    `).all(req.params.quotationId, req.session.companyId);

        const totalReceived = receipts.reduce((sum, r) => sum + r.amount, 0);

        const quotation = db.prepare('SELECT grand_total FROM quotations WHERE id = ?').get(req.params.quotationId);
        const balance = quotation ? quotation.grand_total - totalReceived : 0;

        res.json({ receipts, totalReceived, balance });
    } catch (error) {
        console.error('Get receipts by quotation error:', error);
        res.status(500).json({ error: 'Failed to fetch receipts' });
    }
});

// Get single receipt
router.get('/:id', requireCompany, (req, res) => {
    try {
        const receipt = db.prepare(`
      SELECT r.*, q.quotation_number, q.grand_total as quotation_total,
             c.name as client_name, c.address as client_address, c.phone as client_phone
      FROM receipts r
      LEFT JOIN quotations q ON r.quotation_id = q.id
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE r.id = ? AND r.company_id = ?
    `).get(req.params.id, req.session.companyId);

        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        // Get all receipts for this quotation to calculate balance
        const allReceipts = db.prepare(`
      SELECT SUM(amount) as total FROM receipts WHERE quotation_id = ?
    `).get(receipt.quotation_id);

        receipt.total_received = allReceipts.total || 0;
        receipt.balance = receipt.quotation_total - receipt.total_received;

        res.json(receipt);
    } catch (error) {
        console.error('Get receipt error:', error);
        res.status(500).json({ error: 'Failed to fetch receipt' });
    }
});

// Create receipt
router.post('/', requireCompany, (req, res) => {
    try {
        const { quotation_id, date, amount, payment_mode, transaction_reference, notes } = req.body;

        if (!quotation_id || !amount || !payment_mode) {
            return res.status(400).json({ error: 'Quotation, amount, and payment mode are required' });
        }

        // Verify quotation exists and belongs to current company
        const quotation = db.prepare(`
      SELECT * FROM quotations WHERE id = ? AND company_id = ?
    `).get(quotation_id, req.session.companyId);

        if (!quotation) {
            return res.status(404).json({ error: 'Quotation not found' });
        }

        // Generate receipt number
        const receipt_number = generateReceiptNumber(req.session.companyCode);

        const result = db.prepare(`
      INSERT INTO receipts (company_id, quotation_id, receipt_number, date, amount, payment_mode, transaction_reference, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.session.companyId, quotation_id, receipt_number, date, amount, payment_mode, transaction_reference, notes);

        // Update bill status if exists
        const bill = db.prepare('SELECT * FROM bills WHERE quotation_id = ?').get(quotation_id);
        if (bill) {
            const totalReceived = db.prepare('SELECT SUM(amount) as total FROM receipts WHERE quotation_id = ?').get(quotation_id);
            const newPaidAmount = totalReceived.total || 0;
            const newBalance = bill.grand_total - newPaidAmount;

            let newStatus = 'pending';
            if (newBalance <= 0) {
                newStatus = 'paid';
            } else if (newPaidAmount > 0) {
                newStatus = 'partial';
            }

            db.prepare(`
        UPDATE bills SET paid_amount = ?, balance_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newPaidAmount, newBalance, newStatus, bill.id);
        }

        const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(receipt);
    } catch (error) {
        console.error('Create receipt error:', error);
        res.status(500).json({ error: 'Failed to create receipt' });
    }
});

// Update receipt
router.put('/:id', requireCompany, (req, res) => {
    try {
        const { date, amount, payment_mode, transaction_reference, notes } = req.body;

        db.prepare(`
      UPDATE receipts SET date = ?, amount = ?, payment_mode = ?, transaction_reference = ?, notes = ?
      WHERE id = ? AND company_id = ?
    `).run(date, amount, payment_mode, transaction_reference, notes, req.params.id, req.session.companyId);

        const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(req.params.id);

        // Update bill if exists
        const bill = db.prepare('SELECT * FROM bills WHERE quotation_id = ?').get(receipt.quotation_id);
        if (bill) {
            const totalReceived = db.prepare('SELECT SUM(amount) as total FROM receipts WHERE quotation_id = ?').get(receipt.quotation_id);
            const newPaidAmount = totalReceived.total || 0;
            const newBalance = bill.grand_total - newPaidAmount;

            let newStatus = 'pending';
            if (newBalance <= 0) {
                newStatus = 'paid';
            } else if (newPaidAmount > 0) {
                newStatus = 'partial';
            }

            db.prepare(`
        UPDATE bills SET paid_amount = ?, balance_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newPaidAmount, newBalance, newStatus, bill.id);
        }

        res.json(receipt);
    } catch (error) {
        console.error('Update receipt error:', error);
        res.status(500).json({ error: 'Failed to update receipt' });
    }
});

// Delete receipt
router.delete('/:id', requireCompany, (req, res) => {
    try {
        const receipt = db.prepare('SELECT * FROM receipts WHERE id = ? AND company_id = ?').get(req.params.id, req.session.companyId);

        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        db.prepare('DELETE FROM receipts WHERE id = ?').run(req.params.id);

        // Update bill if exists
        const bill = db.prepare('SELECT * FROM bills WHERE quotation_id = ?').get(receipt.quotation_id);
        if (bill) {
            const totalReceived = db.prepare('SELECT SUM(amount) as total FROM receipts WHERE quotation_id = ?').get(receipt.quotation_id);
            const newPaidAmount = totalReceived.total || 0;
            const newBalance = bill.grand_total - newPaidAmount;

            let newStatus = 'pending';
            if (newBalance <= 0) {
                newStatus = 'paid';
            } else if (newPaidAmount > 0) {
                newStatus = 'partial';
            }

            db.prepare(`
        UPDATE bills SET paid_amount = ?, balance_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newPaidAmount, newBalance, newStatus, bill.id);
        }

        res.json({ success: true, message: 'Receipt deleted successfully' });
    } catch (error) {
        console.error('Delete receipt error:', error);
        res.status(500).json({ error: 'Failed to delete receipt' });
    }
});

export default router;
