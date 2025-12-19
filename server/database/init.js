import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'crm.db');
export const db = new Database(dbPath);

export function initializeDatabase() {
  console.log('📦 Initializing database...');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Companies table
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      gst_number TEXT,
      logo_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Clients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      project_location TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  // Packages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      bhk_type TEXT,
      tier TEXT,
      base_rate_sqft REAL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  // Package items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS package_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      description TEXT,
      unit TEXT,
      sq_foot REAL,
      quantity REAL,
      rate REAL,
      amount REAL,
      room_type TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
    )
  `);

  // Quotations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      quotation_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      total_sqft REAL,
      rate_per_sqft REAL,
      package_id INTEGER,
      bedroom_count INTEGER DEFAULT 1,
      bedroom_config TEXT,
      subtotal REAL,
      discount_type TEXT,
      discount_value REAL,
      discount_amount REAL,
      taxable_amount REAL,
      cgst_percent REAL DEFAULT 9,
      cgst_amount REAL,
      sgst_percent REAL DEFAULT 9,
      sgst_amount REAL,
      total_tax REAL,
      grand_total REAL,
      terms_conditions TEXT,
      notes TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (package_id) REFERENCES packages(id)
    )
  `);

  // Quotation items table with dynamic columns support
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_id INTEGER NOT NULL,
      room_label TEXT,
      item_name TEXT NOT NULL,
      description TEXT,
      material TEXT,
      brand TEXT,
      unit TEXT,
      quantity REAL,
      rate REAL,
      amount REAL,
      remarks TEXT,
      custom_columns TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
    )
  `);

  // Quotation column config table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotation_column_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_id INTEGER NOT NULL,
      columns_config TEXT NOT NULL,
      FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
    )
  `);

  // Receipts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      quotation_id INTEGER NOT NULL,
      receipt_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL,
      transaction_reference TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (quotation_id) REFERENCES quotations(id)
    )
  `);

  // Bills table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      quotation_id INTEGER NOT NULL,
      bill_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      subtotal REAL,
      cgst_percent REAL DEFAULT 9,
      cgst_amount REAL,
      sgst_percent REAL DEFAULT 9,
      sgst_amount REAL,
      total_tax REAL,
      grand_total REAL,
      paid_amount REAL DEFAULT 0,
      balance_amount REAL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (quotation_id) REFERENCES quotations(id)
    )
  `);

  // Insert default admin user if not exists
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existingUser) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, name) VALUES (?, ?, ?)').run('admin', hashedPassword, 'Administrator');
    console.log('✅ Default admin user created (username: admin, password: admin123)');
  }

  // Insert default companies if not exists
  const existingCompanies = db.prepare('SELECT COUNT(*) as count FROM companies').get();
  if (existingCompanies.count === 0) {
    db.prepare(`
      INSERT INTO companies (name, code, address, phone, gst_number) 
      VALUES (?, ?, ?, ?, ?)
    `).run('Aarti Infra', 'AARTI', '123 Construction Street, City', '+91 9876543210', '27AABCU9603R1ZM');

    db.prepare(`
      INSERT INTO companies (name, code, address, phone, gst_number) 
      VALUES (?, ?, ?, ?, ?)
    `).run('Interior & Turnkey Firm', 'INTERIOR', '456 Design Avenue, City', '+91 9876543211', '27AABCU9603R1ZN');

    console.log('✅ Default companies created');
  }

  // Insert default packages if not exists
  const existingPackages = db.prepare('SELECT COUNT(*) as count FROM packages').get();
  if (existingPackages.count === 0) {
    // Aarti Infra packages
    const tiers = ['Silver', 'Gold', 'Platinum'];
    const bhkTypes = ['1 BHK', '2 BHK', '3 BHK', '4 BHK'];
    const baseRates = { Silver: 1200, Gold: 1500, Platinum: 2000 };

    for (const tier of tiers) {
      for (const bhk of bhkTypes) {
        db.prepare(`
          INSERT INTO packages (company_id, name, bhk_type, tier, base_rate_sqft, description, is_active)
          VALUES (1, ?, ?, ?, ?, ?, 1)
        `).run(`${bhk} ${tier} Package`, bhk, tier, baseRates[tier], `Complete ${bhk} construction package with ${tier.toLowerCase()} finishes`);
      }
    }

    // Interior packages
    for (const tier of tiers) {
      for (const bhk of bhkTypes) {
        db.prepare(`
          INSERT INTO packages (company_id, name, bhk_type, tier, base_rate_sqft, description, is_active)
          VALUES (2, ?, ?, ?, ?, ?, 1)
        `).run(`${bhk} ${tier} Interior`, bhk, tier, baseRates[tier] * 0.8, `Complete ${bhk} interior package with ${tier.toLowerCase()} finishes`);
      }
    }

    console.log('✅ Default packages created');
  }

  console.log('✅ Database initialized successfully');
}

export default db;
