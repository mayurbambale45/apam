const db = require('./db');
const fs = require('fs');

async function migrate() {
    try {
        const sql = fs.readFileSync('./upgrade_pipeline.sql', 'utf8');
        await db.query(sql);
        console.log('Migration successful');
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
migrate();
