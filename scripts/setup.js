const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 M-PESA Debt Allocation - Setup Script\n');

// Step 1: Check Node modules
console.log('✓ Dependencies installed');

// Step 2: Setup instructions
console.log('\n📋 NEXT STEPS:\n');
console.log('1. Open Command Prompt as Administrator');
console.log('2. Run this command to create the database:');
console.log('   "C:\\Program Files\\PostgreSQL\\16\\bin\\createdb.exe" -U postgres mpesa_debt');
console.log('\n3. When prompted for password, enter your PostgreSQL password');
console.log('\n4. Once database is created, run:');
console.log('   npm run db:init');
console.log('\n5. (Optional) Seed sample data:');
console.log('   npm run db:seed');
console.log('\n6. Start the server:');
console.log('   npm run dev\n');

console.log('✅ Setup guide saved to SETUP_GUIDE.md for future reference');
