import express from 'express';
import PDFDocument from 'pdfkit';
import { db } from '../database/init.js';

const router = express.Router();

// Middleware to check company selection
const requireCompany = (req, res, next) => {
    if (!req.session.companyId) {
        return res.status(400).json({ error: 'Please select a company first' });
    }
    next();
};

// Helper to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount || 0);
}

// Helper to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Generate Quotation PDF
router.get('/quotation/:id', requireCompany, (req, res) => {
    try {
        const quotation = db.prepare(`
      SELECT q.*, c.name as client_name, c.address as client_address, 
             c.phone as client_phone, c.project_location,
             comp.name as company_name, comp.address as company_address,
             comp.phone as company_phone, comp.gst_number
      FROM quotations q
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN companies comp ON q.company_id = comp.id
      WHERE q.id = ? AND q.company_id = ?
    `).get(req.params.id, req.session.companyId);

        if (!quotation) {
            return res.status(404).json({ error: 'Quotation not found' });
        }

        const items = db.prepare(`
      SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order
    `).all(req.params.id);

        // Create PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Quotation-${quotation.quotation_number.replace(/\//g, '-')}.pdf"`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text(quotation.company_name, { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(quotation.company_address, { align: 'center' });
        doc.text(`Phone: ${quotation.company_phone} | GST: ${quotation.gst_number}`, { align: 'center' });
        doc.moveDown();

        // Quotation Title
        doc.fontSize(16).font('Helvetica-Bold').text('QUOTATION', { align: 'center' });
        doc.moveDown(0.5);

        // Quotation Details
        doc.fontSize(10).font('Helvetica');
        const startY = doc.y;

        doc.text(`Quotation No: ${quotation.quotation_number}`, 50, startY);
        doc.text(`Date: ${formatDate(quotation.date)}`, 400, startY);
        doc.moveDown();

        // Client Details Box
        doc.rect(50, doc.y, 500, 70).stroke();
        const clientBoxY = doc.y + 10;
        doc.text('Bill To:', 60, clientBoxY);
        doc.font('Helvetica-Bold').text(quotation.client_name, 60, clientBoxY + 15);
        doc.font('Helvetica').text(quotation.client_address || '', 60, clientBoxY + 30);
        doc.text(`Phone: ${quotation.client_phone || 'N/A'}`, 60, clientBoxY + 45);
        doc.text(`Project Location: ${quotation.project_location || 'N/A'}`, 300, clientBoxY + 15);
        doc.text(`Total Sqft: ${quotation.total_sqft || 'N/A'}`, 300, clientBoxY + 30);
        doc.text(`Rate/Sqft: ${formatCurrency(quotation.rate_per_sqft)}`, 300, clientBoxY + 45);

        doc.y = clientBoxY + 80;

        // Items Table Header
        const tableTop = doc.y;
        const tableHeaders = ['#', 'Description', 'Room', 'Qty', 'Rate', 'Amount'];
        const colWidths = [30, 180, 80, 50, 70, 90];
        let xPos = 50;

        doc.rect(50, tableTop, 500, 20).fill('#1a1a2e');
        doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');

        tableHeaders.forEach((header, i) => {
            doc.text(header, xPos + 5, tableTop + 6, { width: colWidths[i] - 10 });
            xPos += colWidths[i];
        });

        doc.fillColor('#000000').font('Helvetica');

        // Items
        let yPos = tableTop + 25;
        items.forEach((item, index) => {
            if (yPos > 700) {
                doc.addPage();
                yPos = 50;
            }

            xPos = 50;
            const rowColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
            doc.rect(50, yPos - 5, 500, 20).fill(rowColor);
            doc.fillColor('#000000');

            doc.text((index + 1).toString(), xPos + 5, yPos, { width: colWidths[0] - 10 });
            xPos += colWidths[0];
            doc.text(item.item_name, xPos + 5, yPos, { width: colWidths[1] - 10 });
            xPos += colWidths[1];
            doc.text(item.room_label || '-', xPos + 5, yPos, { width: colWidths[2] - 10 });
            xPos += colWidths[2];
            doc.text((item.quantity || 1).toString(), xPos + 5, yPos, { width: colWidths[3] - 10 });
            xPos += colWidths[3];
            doc.text(formatCurrency(item.rate), xPos + 5, yPos, { width: colWidths[4] - 10 });
            xPos += colWidths[4];
            doc.text(formatCurrency(item.amount), xPos + 5, yPos, { width: colWidths[5] - 10 });

            yPos += 20;
        });

        // Summary
        yPos += 10;
        doc.rect(350, yPos, 200, 100).stroke();

        const summaryX = 360;
        doc.fontSize(9);
        doc.text('Subtotal:', summaryX, yPos + 10);
        doc.text(formatCurrency(quotation.subtotal), 470, yPos + 10, { align: 'right', width: 70 });

        if (quotation.discount_amount > 0) {
            doc.text(`Discount (${quotation.discount_type === 'percentage' ? quotation.discount_value + '%' : 'Flat'}):`, summaryX, yPos + 25);
            doc.text(`-${formatCurrency(quotation.discount_amount)}`, 470, yPos + 25, { align: 'right', width: 70 });
        }

        doc.text('Taxable Amount:', summaryX, yPos + 40);
        doc.text(formatCurrency(quotation.taxable_amount), 470, yPos + 40, { align: 'right', width: 70 });

        doc.text(`CGST (${quotation.cgst_percent}%):`, summaryX, yPos + 55);
        doc.text(formatCurrency(quotation.cgst_amount), 470, yPos + 55, { align: 'right', width: 70 });

        doc.text(`SGST (${quotation.sgst_percent}%):`, summaryX, yPos + 70);
        doc.text(formatCurrency(quotation.sgst_amount), 470, yPos + 70, { align: 'right', width: 70 });

        doc.font('Helvetica-Bold').fontSize(11);
        doc.text('Grand Total:', summaryX, yPos + 85);
        doc.text(formatCurrency(quotation.grand_total), 470, yPos + 85, { align: 'right', width: 70 });

        // Terms and Conditions
        if (quotation.terms_conditions) {
            yPos += 120;
            doc.font('Helvetica-Bold').fontSize(10).text('Terms & Conditions:', 50, yPos);
            doc.font('Helvetica').fontSize(8).text(quotation.terms_conditions, 50, yPos + 15, { width: 500 });
        }

        // Footer
        doc.fontSize(8).text('This is a computer generated quotation.', 50, 780, { align: 'center' });

        doc.end();
    } catch (error) {
        console.error('Generate quotation PDF error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// Generate Receipt PDF
router.get('/receipt/:id', requireCompany, (req, res) => {
    try {
        const receipt = db.prepare(`
      SELECT r.*, q.quotation_number, q.grand_total as total_amount,
             c.name as client_name, c.address as client_address, c.phone as client_phone,
             comp.name as company_name, comp.address as company_address,
             comp.phone as company_phone, comp.gst_number
      FROM receipts r
      LEFT JOIN quotations q ON r.quotation_id = q.id
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN companies comp ON r.company_id = comp.id
      WHERE r.id = ? AND r.company_id = ?
    `).get(req.params.id, req.session.companyId);

        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        // Get total paid for balance calculation
        const totalPaid = db.prepare(`
      SELECT SUM(amount) as total FROM receipts WHERE quotation_id = ?
    `).get(receipt.quotation_id);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Receipt-${receipt.receipt_number.replace(/\//g, '-')}.pdf"`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text(receipt.company_name, { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(receipt.company_address, { align: 'center' });
        doc.text(`Phone: ${receipt.company_phone} | GST: ${receipt.gst_number}`, { align: 'center' });
        doc.moveDown();

        // Receipt Title
        doc.fontSize(16).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
        doc.moveDown();

        // Receipt Details Box
        doc.rect(50, doc.y, 500, 150).stroke();
        const boxY = doc.y + 15;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(`Receipt No: ${receipt.receipt_number}`, 60, boxY);
        doc.text(`Date: ${formatDate(receipt.date)}`, 400, boxY);

        doc.moveDown();
        doc.font('Helvetica');
        doc.text('Received From:', 60, boxY + 30);
        doc.font('Helvetica-Bold').text(receipt.client_name, 150, boxY + 30);

        doc.font('Helvetica');
        doc.text('Address:', 60, boxY + 50);
        doc.text(receipt.client_address || 'N/A', 150, boxY + 50);

        doc.text('Phone:', 60, boxY + 70);
        doc.text(receipt.client_phone || 'N/A', 150, boxY + 70);

        doc.text('Quotation Ref:', 60, boxY + 90);
        doc.text(receipt.quotation_number, 150, boxY + 90);

        doc.text('Payment Mode:', 60, boxY + 110);
        doc.text(receipt.payment_mode, 150, boxY + 110);

        if (receipt.transaction_reference) {
            doc.text('Transaction Ref:', 300, boxY + 110);
            doc.text(receipt.transaction_reference, 400, boxY + 110);
        }

        doc.y = boxY + 180;

        // Amount Box
        doc.rect(150, doc.y, 300, 60).fill('#1a1a2e');
        doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold');
        doc.text('Amount Received', 200, doc.y + 15, { width: 200, align: 'center' });
        doc.fontSize(20).text(formatCurrency(receipt.amount), 200, doc.y + 35, { width: 200, align: 'center' });

        doc.fillColor('#000000');
        doc.y += 80;

        // Summary
        doc.fontSize(10).font('Helvetica');
        doc.text(`Total Quotation Amount: ${formatCurrency(receipt.total_amount)}`, 60);
        doc.text(`Total Amount Paid: ${formatCurrency(totalPaid.total)}`, 60);
        doc.text(`Balance Due: ${formatCurrency(receipt.total_amount - totalPaid.total)}`, 60);

        // Notes
        if (receipt.notes) {
            doc.moveDown();
            doc.text(`Notes: ${receipt.notes}`);
        }

        // Signature
        doc.y = 650;
        doc.text('____________________', 400);
        doc.text('Authorized Signature', 400);

        // Footer
        doc.fontSize(8).text('This is a computer generated receipt.', 50, 780, { align: 'center' });

        doc.end();
    } catch (error) {
        console.error('Generate receipt PDF error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// Generate Bill/Invoice PDF
router.get('/bill/:id', requireCompany, (req, res) => {
    try {
        const bill = db.prepare(`
      SELECT b.*, q.quotation_number, q.total_sqft, q.rate_per_sqft, q.bedroom_count,
             c.name as client_name, c.address as client_address, 
             c.phone as client_phone, c.project_location,
             comp.name as company_name, comp.address as company_address,
             comp.phone as company_phone, comp.gst_number
      FROM bills b
      LEFT JOIN quotations q ON b.quotation_id = q.id
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN companies comp ON b.company_id = comp.id
      WHERE b.id = ? AND b.company_id = ?
    `).get(req.params.id, req.session.companyId);

        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        const items = db.prepare(`
      SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order
    `).all(bill.quotation_id);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Invoice-${bill.bill_number.replace(/\//g, '-')}.pdf"`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text(bill.company_name, { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(bill.company_address, { align: 'center' });
        doc.text(`Phone: ${bill.company_phone} | GST: ${bill.gst_number}`, { align: 'center' });
        doc.moveDown();

        // Invoice Title
        doc.fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
        doc.moveDown(0.5);

        // Invoice Details
        doc.fontSize(10).font('Helvetica');
        const startY = doc.y;

        doc.text(`Invoice No: ${bill.bill_number}`, 50, startY);
        doc.text(`Date: ${formatDate(bill.date)}`, 400, startY);
        doc.text(`Quotation Ref: ${bill.quotation_number}`, 50, startY + 15);
        doc.moveDown();

        // Client Details Box
        doc.rect(50, doc.y, 500, 60).stroke();
        const clientBoxY = doc.y + 10;
        doc.text('Bill To:', 60, clientBoxY);
        doc.font('Helvetica-Bold').text(bill.client_name, 60, clientBoxY + 15);
        doc.font('Helvetica').text(bill.client_address || '', 60, clientBoxY + 30);
        doc.text(`Phone: ${bill.client_phone || 'N/A'}`, 300, clientBoxY + 15);
        doc.text(`Project: ${bill.project_location || 'N/A'}`, 300, clientBoxY + 30);

        doc.y = clientBoxY + 70;

        // Items Table
        const tableTop = doc.y;
        const tableHeaders = ['#', 'Description', 'Room', 'Qty', 'Rate', 'Amount'];
        const colWidths = [30, 180, 80, 50, 70, 90];
        let xPos = 50;

        doc.rect(50, tableTop, 500, 20).fill('#1a1a2e');
        doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');

        tableHeaders.forEach((header, i) => {
            doc.text(header, xPos + 5, tableTop + 6, { width: colWidths[i] - 10 });
            xPos += colWidths[i];
        });

        doc.fillColor('#000000').font('Helvetica');

        let yPos = tableTop + 25;
        items.forEach((item, index) => {
            if (yPos > 650) {
                doc.addPage();
                yPos = 50;
            }

            xPos = 50;
            const rowColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
            doc.rect(50, yPos - 5, 500, 20).fill(rowColor);
            doc.fillColor('#000000');

            doc.text((index + 1).toString(), xPos + 5, yPos, { width: colWidths[0] - 10 });
            xPos += colWidths[0];
            doc.text(item.item_name, xPos + 5, yPos, { width: colWidths[1] - 10 });
            xPos += colWidths[1];
            doc.text(item.room_label || '-', xPos + 5, yPos, { width: colWidths[2] - 10 });
            xPos += colWidths[2];
            doc.text((item.quantity || 1).toString(), xPos + 5, yPos, { width: colWidths[3] - 10 });
            xPos += colWidths[3];
            doc.text(formatCurrency(item.rate), xPos + 5, yPos, { width: colWidths[4] - 10 });
            xPos += colWidths[4];
            doc.text(formatCurrency(item.amount), xPos + 5, yPos, { width: colWidths[5] - 10 });

            yPos += 20;
        });

        // Summary
        yPos += 10;
        doc.rect(350, yPos, 200, 120).stroke();

        const summaryX = 360;
        doc.fontSize(9);
        doc.text('Subtotal:', summaryX, yPos + 10);
        doc.text(formatCurrency(bill.subtotal), 470, yPos + 10, { align: 'right', width: 70 });

        doc.text(`CGST (${bill.cgst_percent}%):`, summaryX, yPos + 25);
        doc.text(formatCurrency(bill.cgst_amount), 470, yPos + 25, { align: 'right', width: 70 });

        doc.text(`SGST (${bill.sgst_percent}%):`, summaryX, yPos + 40);
        doc.text(formatCurrency(bill.sgst_amount), 470, yPos + 40, { align: 'right', width: 70 });

        doc.font('Helvetica-Bold');
        doc.text('Grand Total:', summaryX, yPos + 60);
        doc.text(formatCurrency(bill.grand_total), 470, yPos + 60, { align: 'right', width: 70 });

        doc.font('Helvetica');
        doc.text('Amount Paid:', summaryX, yPos + 80);
        doc.text(formatCurrency(bill.paid_amount), 470, yPos + 80, { align: 'right', width: 70 });

        doc.font('Helvetica-Bold');
        doc.text('Balance Due:', summaryX, yPos + 100);
        doc.text(formatCurrency(bill.balance_amount), 470, yPos + 100, { align: 'right', width: 70 });

        // Payment Status
        const statusColors = { paid: '#28a745', partial: '#ffc107', pending: '#dc3545' };
        const statusColor = statusColors[bill.status] || '#6c757d';
        doc.rect(50, yPos + 20, 80, 25).fill(statusColor);
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
        doc.text(bill.status.toUpperCase(), 55, yPos + 28);

        // Footer
        doc.fillColor('#000000');
        doc.fontSize(8).text('This is a computer generated invoice.', 50, 780, { align: 'center' });

        doc.end();
    } catch (error) {
        console.error('Generate bill PDF error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// WhatsApp share URL generator
router.get('/whatsapp/:type/:id', requireCompany, (req, res) => {
    try {
        const { type, id } = req.params;
        let message = '';
        let document = null;

        if (type === 'quotation') {
            document = db.prepare(`
        SELECT q.quotation_number, q.grand_total, c.name as client_name, c.phone
        FROM quotations q
        LEFT JOIN clients c ON q.client_id = c.id
        WHERE q.id = ? AND q.company_id = ?
      `).get(id, req.session.companyId);

            if (document) {
                message = `Dear ${document.client_name},\n\nPlease find your quotation:\n\nQuotation No: ${document.quotation_number}\nTotal Amount: ${formatCurrency(document.grand_total)}\n\nThank you for your business!\n\n- ${req.session.companyName}`;
            }
        } else if (type === 'receipt') {
            document = db.prepare(`
        SELECT r.receipt_number, r.amount, c.name as client_name, c.phone
        FROM receipts r
        LEFT JOIN quotations q ON r.quotation_id = q.id
        LEFT JOIN clients c ON q.client_id = c.id
        WHERE r.id = ? AND r.company_id = ?
      `).get(id, req.session.companyId);

            if (document) {
                message = `Dear ${document.client_name},\n\nPayment Received:\n\nReceipt No: ${document.receipt_number}\nAmount: ${formatCurrency(document.amount)}\n\nThank you!\n\n- ${req.session.companyName}`;
            }
        } else if (type === 'bill') {
            document = db.prepare(`
        SELECT b.bill_number, b.grand_total, b.balance_amount, c.name as client_name, c.phone
        FROM bills b
        LEFT JOIN quotations q ON b.quotation_id = q.id
        LEFT JOIN clients c ON q.client_id = c.id
        WHERE b.id = ? AND b.company_id = ?
      `).get(id, req.session.companyId);

            if (document) {
                message = `Dear ${document.client_name},\n\nInvoice Details:\n\nInvoice No: ${document.bill_number}\nTotal: ${formatCurrency(document.grand_total)}\nBalance Due: ${formatCurrency(document.balance_amount)}\n\nThank you!\n\n- ${req.session.companyName}`;
            }
        }

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const phone = document.phone ? document.phone.replace(/[^0-9]/g, '') : '';
        const whatsappUrl = `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodeURIComponent(message)}`;

        res.json({
            whatsappUrl,
            message,
            phone: document.phone
        });
    } catch (error) {
        console.error('WhatsApp share error:', error);
        res.status(500).json({ error: 'Failed to generate WhatsApp link' });
    }
});

export default router;
