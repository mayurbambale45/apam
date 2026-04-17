require('dotenv').config();
const { Pool } = require('pg');
const db = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

async function check() {
    try {
        const query = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='grievances';
        `;
        const res = await db.query(query);
        console.log("Columns in grievances table:", res.rows.map(r => r.column_name));
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
check();
