const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');
require('dotenv').config();

async function runMigrations() {
  try {
    console.log('🔄 Running migrations...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✓ Connected to database\n');
    
    const migrationsDir = path.join(__dirname, '../src/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).sort();
    
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`Running migration: ${file}`);
      const statements = sql.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await pool.query(statement);
        }
      }
      
      console.log(`✓ ${file} completed\n`);
    }
    
    console.log('✓ All migrations completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('✗ Migration error:');
    console.error('Error:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    process.exit(1);
  }
}

runMigrations();
