const bcrypt = require('bcrypt');
const db = require('./db');

async function forcePasswords() {
    try {
        const hash = await bcrypt.hash('password123', 10);
        await db.query(
            "UPDATE users SET password_hash = $1 WHERE email IN ('a.deshpande@walchandsangli.ac.in', 'prn2022027001@walchandsangli.ac.in')",
            [hash]
        );
        console.log('Updated passwords easily.');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

forcePasswords();
