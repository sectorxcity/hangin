const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'hangin.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        balance REAL DEFAULT 0,
        crypto_wallet TEXT,
        bank_details TEXT
      )
    `, () => {
      // Ignore errors if columns already exist
      db.run("ALTER TABLE users ADD COLUMN crypto_wallet TEXT", () => {});
      db.run("ALTER TABLE users ADD COLUMN bank_details TEXT", () => {});
    });

    // Create Transactions Table
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        buyer_id INTEGER,
        seller_id INTEGER,
        title TEXT,
        amount REAL,
        status TEXT DEFAULT 'pending', -- pending, funded, verified, completed, cancelled, refunded
        refund_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(buyer_id) REFERENCES users(id),
        FOREIGN KEY(seller_id) REFERENCES users(id)
      )
    `);

    // Create Offers Table
    db.run(`
      CREATE TABLE IF NOT EXISTS offers (
        id TEXT PRIMARY KEY,
        seller_id INTEGER,
        title TEXT,
        amount REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(seller_id) REFERENCES users(id)
      )
    `);

    // Create Crypto Deposits Table
    db.run(`
      CREATE TABLE IF NOT EXISTS crypto_deposits (
        tx_hash TEXT PRIMARY KEY,
        user_id INTEGER,
        amount REAL,
        currency TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);
  }
});

module.exports = db;
