const bcrypt = require('bcrypt');
const db = require('./db');

async function check() {
    try {
        const userRes = await db.query('SELECT * FROM users');
        console.log(`Found ${userRes.rows.length} users in DB`);
        
        for (const user of userRes.rows) {
            console.log(`Checking user: ${user.email}`);
            const isMatch = await bcrypt.compare('password123', user.password_hash);
            console.log(` - Password match for "password123": ${isMatch}`);
        }
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
