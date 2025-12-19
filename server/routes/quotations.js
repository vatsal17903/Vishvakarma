import express from 'express';
import { db } from '../database/init.js';

const router = express.Router();

// Maximum discount allowed (30%)
const MAX_DISCOUNT_PERCENT = 30;

// Middleware to check company selection
const requireCompany = (req, res, next) => {
    if (!req.session.companyId) {
        return res.status(400).json({ error: 'Please select a company first' });
    }
    next();
};

// Generate quotation number
function generateQuotationNumber(companyCode) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    const lastQuotation = db.prepare(`
    SELECT quotation_number FROM quotations 
    WHERE quotation_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${companyCode}/${year}${month}%`);

    let sequence = 1;
    if (lastQuotation) {
        const parts = lastQuotation.quotation_number.split('/');
        sequence = parseInt(parts[parts.length - 1]) + 1;
    }

    return `${companyCode}/${year}${month}/${sequence.toString().padStart(4, '0')}`;
}

// Validate discount
function validateDiscount(discountType, discountValue, subtotal) {
    if (!discountType || discountValue <= 0) {
        return { valid: true, discountAmount: 0 };
    }

    let discountAmount = 0;
    let discountPercent = 0;

    if (discountType === 'percentage') {
        discountPercent = discountValue;
        discountAmount = (subtotal * discountValue) / 100;
    } else {
        discountAmount = discountValue;
        discountPercent = (discountValue / subtotal) * 100;
    }

    if (discountPercent > MAX_DISCOUNT_PERCENT) {
        return {
            valid: false,
            error: `Discount cannot exceed ${MAX_DISCOUNT_PERCENT}%. Current discount is ${discountPercent.toFixed(2)}%`
        };
    }

    return { valid: true, discountAmount };
}

// Get all quotations for current company
router.get('/', requireCompany, (req, res) => {
    try {
        const quotations = db.prepare(`
      SELECT q.*, c.name as client_name, c.phone as client_phone
      FROM quotations q
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE q.company_id = ?
      ORDER BY q.created_at DESC
    `).all(req.session.companyId);
        res.json(quotations);
    } catch (error) {
        console.error('Get quotations error:', error);
        res.status(500).json({ error: 'Failed to fetch quotations' });
    }
});

// Get recent quotations
router.get('/recent', requireCompany, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const quotations = db.prepare(`
      SELECT q.*, c.name as client_name
      FROM quotations q
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE q.company_id = ?
      ORDER BY q.created_at DESC
      LIMIT ?
    `).all(req.session.companyId, limit);
        res.json(quotations);
    } catch (error) {
        console.error('Get recent quotations error:', error);
        res.status(500).json({ error: 'Failed to fetch recent quotations' });
    }
});

// Get single quotation with items
router.get('/:id', requireCompany, (req, res) => {
    try {
        const quotation = db.prepare(`
      SELECT q.*, c.name as client_name, c.address as client_address, 
             c.phone as client_phone, c.email as client_email, c.project_location
      FROM quotations q
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE q.id = ? AND q.company_id = ?
    `).get(req.params.id, req.session.companyId);

        if (!quotation) {
            return res.status(404).json({ error: 'Quotation not found' });
        }

        const items = db.prepare(`
      SELECT * FROM quotation_items 
      WHERE quotation_id = ?
      ORDER BY sort_order, id
    `).all(req.params.id);

        const columnConfig = db.prepare(`
      SELECT columns_config FROM quotation_column_config 
      WHERE quotation_id = ?
    `).get(req.params.id);

        // Get related receipts
        const receipts = db.prepare(`
      SELECT * FROM receipts 
      WHERE quotation_id = ?
      ORDER BY date DESC
    `).all(req.params.id);

        // Get related bill
        const bill = db.prepare(`
      SELECT * FROM bills 
      WHERE quotation_id = ?
    `).get(req.params.id);

        res.json({
            ...quotation,
            items,
            columnConfig: columnConfig ? JSON.parse(columnConfig.columns_config) : null,
            receipts,
            bill
        });
    } catch (error) {
        console.error('Get quotation error:', error);
        res.status(500).json({ error: 'Failed to fetch quotation' });
    }
});

// Create quotation
router.post('/', requireCompany, (req, res) => {
    try {
        const {
            client_id, date, total_sqft, rate_per_sqft, package_id,
            bedroom_count, bedroom_config, items, column_config,
            discount_type, discount_value, cgst_percent, sgst_percent,
            terms_conditions, notes, status
        } = req.body;

        // Calculate subtotal from items
        let subtotal = 0;
        if (items && items.length > 0) {
            subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        } else if (total_sqft && rate_per_sqft) {
            subtotal = total_sqft * rate_per_sqft;
        }

        // Validate discount (BACKEND ENFORCEMENT)
        const discountValidation = validateDiscount(discount_type, discount_value || 0, subtotal);
        if (!discountValidation.valid) {
            return res.status(400).json({ error: discountValidation.error });
        }

        const discount_amount = discountValidation.discountAmount;
        const taxable_amount = subtotal - discount_amount;
        const cgst = cgst_percent || 9;
        const sgst = sgst_percent || 9;
        const cgst_amount = (taxable_amount * cgst) / 100;
        const sgst_amount = (taxable_amount * sgst) / 100;
        const total_tax = cgst_amount + sgst_amount;
        const grand_total = taxable_amount + total_tax;

        // Generate quotation number
        const quotation_number = generateQuotationNumber(req.session.companyCode);

        const result = db.prepare(`
      INSERT INTO quotations (
        company_id, client_id, quotation_number, date, total_sqft, rate_per_sqft,
        package_id, bedroom_count, bedroom_config, subtotal, discount_type,
        discount_value, discount_amount, taxable_amount, cgst_percent, cgst_amount,
        sgst_percent, sgst_amount, total_tax, grand_total, terms_conditions, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            req.session.companyId, client_id, quotation_number, date, total_sqft, rate_per_sqft,
            package_id, bedroom_count || 1, JSON.stringify(bedroom_config || []),
            subtotal, discount_type, discount_value, discount_amount, taxable_amount,
            cgst, cgst_amount, sgst, sgst_amount, total_tax, grand_total,
            terms_conditions, notes, status || 'draft'
        );

        const quotationId = result.lastInsertRowid;

        // Insert items
        if (items && items.length > 0) {
            const insertItem = db.prepare(`
        INSERT INTO quotation_items (
          quotation_id, room_label, item_name, description, material, brand,
          unit, quantity, rate, amount, remarks, custom_columns, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

            items.forEach((item, index) => {
                insertItem.run(
                    quotationId, item.room_label, item.item_name, item.description,
                    item.material, item.brand, item.unit, item.quantity, item.rate,
                    item.amount, item.remarks, JSON.stringify(item.custom_columns || {}), index
                );
            });
        }

        // Save column config
        if (column_config) {
            db.prepare(`
        INSERT INTO quotation_column_config (quotation_id, columns_config)
        VALUES (?, ?)
      `).run(quotationId, JSON.stringify(column_config));
        }

        const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(quotationId);
        res.status(201).json(quotation);
    } catch (error) {
        console.error('Create quotation error:', error);
        res.status(500).json({ error: 'Failed to create quotation' });
    }
});

// Update quotation
router.put('/:id', requireCompany, (req, res) => {
    try {
        const {
            client_id, date, total_sqft, rate_per_sqft, package_id,
            bedroom_count, bedroom_config, items, column_config,
            discount_type, discount_value, cgst_percent, sgst_percent,
            terms_conditions, notes, status
        } = req.body;

        // Calculate subtotal from items
        let subtotal = 0;
        if (items && items.length > 0) {
            subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        } else if (total_sqft && rate_per_sqft) {
            subtotal = total_sqft * rate_per_sqft;
        }

        // Validate discount (BACKEND ENFORCEMENT)
        const discountValidation = validateDiscount(discount_type, discount_value || 0, subtotal);
        if (!discountValidation.valid) {
            return res.status(400).json({ error: discountValidation.error });
        }

        const discount_amount = discountValidation.discountAmount;
        const taxable_amount = subtotal - discount_amount;
        const cgst = cgst_percent || 9;
        const sgst = sgst_percent || 9;
        const cgst_amount = (taxable_amount * cgst) / 100;
        const sgst_amount = (taxable_amount * sgst) / 100;
        const total_tax = cgst_amount + sgst_amount;
        const grand_total = taxable_amount + total_tax;

        db.prepare(`
      UPDATE quotations SET
        client_id = ?, date = ?, total_sqft = ?, rate_per_sqft = ?,
        package_id = ?, bedroom_count = ?, bedroom_config = ?, subtotal = ?,
        discount_type = ?, discount_value = ?, discount_amount = ?, taxable_amount = ?,
        cgst_percent = ?, cgst_amount = ?, sgst_percent = ?, sgst_amount = ?,
        total_tax = ?, grand_total = ?, terms_conditions = ?, notes = ?,
        status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ?
    `).run(
            client_id, date, total_sqft, rate_per_sqft, package_id,
            bedroom_count || 1, JSON.stringify(bedroom_config || []),
            subtotal, discount_type, discount_value, discount_amount, taxable_amount,
            cgst, cgst_amount, sgst, sgst_amount, total_tax, grand_total,
            terms_conditions, notes, status, req.params.id, req.session.companyId
        );

        // Update items
        if (items) {
            db.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').run(req.params.id);

            const insertItem = db.prepare(`
        INSERT INTO quotation_items (
          quotation_id, room_label, item_name, description, material, brand,
          unit, quantity, rate, amount, remarks, custom_columns, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

            items.forEach((item, index) => {
                insertItem.run(
                    req.params.id, item.room_label, item.item_name, item.description,
                    item.material, item.brand, item.unit, item.quantity, item.rate,
                    item.amount, item.remarks, JSON.stringify(item.custom_columns || {}), index
                );
            });
        }

        // Update column config
        if (column_config) {
            db.prepare('DELETE FROM quotation_column_config WHERE quotation_id = ?').run(req.params.id);
            db.prepare(`
        INSERT INTO quotation_column_config (quotation_id, columns_config)
        VALUES (?, ?)
      `).run(req.params.id, JSON.stringify(column_config));
        }

        const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id);
        res.json(quotation);
    } catch (error) {
        console.error('Update quotation error:', error);
        res.status(500).json({ error: 'Failed to update quotation' });
    }
});

// Delete quotation
router.delete('/:id', requireCompany, (req, res) => {
    try {
        // Check for receipts
        const receipts = db.prepare('SELECT COUNT(*) as count FROM receipts WHERE quotation_id = ?').get(req.params.id);
        if (receipts.count > 0) {
            return res.status(400).json({ error: 'Cannot delete quotation with receipts' });
        }

        // Check for bills
        const bills = db.prepare('SELECT COUNT(*) as count FROM bills WHERE quotation_id = ?').get(req.params.id);
        if (bills.count > 0) {
            return res.status(400).json({ error: 'Cannot delete quotation with bills' });
        }

        db.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').run(req.params.id);
        db.prepare('DELETE FROM quotation_column_config WHERE quotation_id = ?').run(req.params.id);
        db.prepare('DELETE FROM quotations WHERE id = ? AND company_id = ?').run(req.params.id, req.session.companyId);

        res.json({ success: true, message: 'Quotation deleted successfully' });
    } catch (error) {
        console.error('Delete quotation error:', error);
        res.status(500).json({ error: 'Failed to delete quotation' });
    }
});

// Calculate project cost
router.post('/calculate', (req, res) => {
    try {
        const { total_sqft, rate_per_sqft, discount_type, discount_value, cgst_percent, sgst_percent } = req.body;

        const subtotal = (total_sqft || 0) * (rate_per_sqft || 0);

        const discountValidation = validateDiscount(discount_type, discount_value || 0, subtotal);
        if (!discountValidation.valid) {
            return res.status(400).json({ error: discountValidation.error });
        }

        const discount_amount = discountValidation.discountAmount;
        const taxable_amount = subtotal - discount_amount;
        const cgst = cgst_percent || 9;
        const sgst = sgst_percent || 9;
        const cgst_amount = (taxable_amount * cgst) / 100;
        const sgst_amount = (taxable_amount * sgst) / 100;
        const total_tax = cgst_amount + sgst_amount;
        const grand_total = taxable_amount + total_tax;

        res.json({
            subtotal,
            discount_amount,
            taxable_amount,
            cgst_amount,
            sgst_amount,
            total_tax,
            grand_total
        });
    } catch (error) {
        console.error('Calculate error:', error);
        res.status(500).json({ error: 'Failed to calculate' });
    }
});

export default router;
