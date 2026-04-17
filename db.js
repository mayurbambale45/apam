require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 5432,
    // Production-grade pool settings
    max: 20,                        // max connections
    min: 2,                         // keep at least 2 alive
    idleTimeoutMillis: 30000,       // release idle connections after 30s
    connectionTimeoutMillis: 5000,  // wait up to 5s for a connection
    allowExitOnIdle: false,         // keep pool alive
});

// Log pool errors without crashing the app — retries happen automatically
pool.on('error', (err) => {
    console.error('[DB Pool] Unexpected idle client error:', err.message);
    // Do NOT call process.exit() here. pg will auto-recover connections.
});

pool.on('connect', () => {
    // Uncomment for verbose debugging:
    // console.log('[DB Pool] New client connected');
});

/**
 * Execute a parameterized query.
 * Automatically retries once on transient connection errors (e.g. connection timeout).
 */
const query = async (text, params) => {
    try {
        return await pool.query(text, params);
    } catch (err) {
        // Retry once on connection-level errors (not query logic errors)
        if (err.code === 'ECONNREFUSED' || err.code === '57P01' || err.code === 'XX000') {
            console.warn('[DB] Transient error, retrying query once...');
            return await pool.query(text, params);
        }
        throw err;
    }
};

module.exports = {
    query,
    getClient: () => pool.connect(),
    pool,
};
