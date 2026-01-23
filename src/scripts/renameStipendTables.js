const db = require('../config/db');

async function renameTables() {
    try {
        console.log('Renaming tables...');

        await db.query('RENAME TABLE stipends TO available_stipends');
        console.log('Renamed stipends -> available_stipends');

        await db.query('RENAME TABLE stipend_applications TO stipends_applications');
        console.log('Renamed stipend_applications -> stipends_applications');

        process.exit(0);
    } catch (error) {
        console.error('Error renaming tables:', error);
        // If error is "Table already exists", it might be fine, but good to know.
        process.exit(1);
    }
}

renameTables();
