const fs = require('fs');
const db = require('./db');

async function checkUsers() {
    const res = await db.query("SELECT id, role, email FROM users");
    fs.writeFileSync('users_debug.json', JSON.stringify(res.rows, null, 2));
    console.log("Users dumped to users_debug.json");
    process.exit(0);
}

checkUsers();
