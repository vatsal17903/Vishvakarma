# CRM Application - Construction & Interior Business

A complete, production-ready CRM web application for construction, interior, and turnkey business.

## Features

- **Two Companies**: Aarti Infra (Construction) & Interior & Turnkey Firm
- **Single-user System**: Owner/Admin only
- **Mobile & Tablet Optimized**: Responsive design
- **Dynamic Configuration**: Configurable bedrooms, dynamic table columns
- **PDF Generation**: Fixed-format PDFs with dynamic data
- **WhatsApp Sharing**: Share documents directly via WhatsApp

## Modules

1. Authentication Module
2. Company Selection
3. Dashboard
4. Client/Party Management
5. Project Cost Calculator
6. Package Management
7. Discount Management (30% cap)
8. Quotation Management
9. Payment Receipt Module
10. Billing/Invoice Module
11. Document Linking
12. Reports Module
13. PDF Template Module

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite with better-sqlite3
- **Frontend**: React + Vite
- **PDF**: PDFKit
- **Styling**: Custom CSS (Mobile-first)

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
# Start backend server
npm run server

# Start frontend (in another terminal)
npm run dev

# Start both concurrently
npm start
```

### Production

```bash
npm run build
npm run server
```

## API Endpoints

See `/server/routes/` for complete API documentation.

## License

Private - All rights reserved
