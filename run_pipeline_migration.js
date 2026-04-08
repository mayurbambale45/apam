require('dotenv').config();
const db = require('./db');
const fs = require('fs');
const path = require('path');

async function migrate() {
    const sql = fs.readFileSync(path.join(__dirname, 'add_pipeline.sql'), 'utf8');
    try {
        await db.query(sql);
        console.log('Pipeline migration successful.');
    } catch (e) {
        console.error('Migration error:', e.message);
    } finally {
        process.exit(0);
    }
}

migrate();
