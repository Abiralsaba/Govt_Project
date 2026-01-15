const db = require('../src/config/db');

async function verifyFinalTables() {
    try {
        const [rows] = await db.query('SHOW TABLES');
        const tables = rows.map(t => Object.values(t)[0]).sort();

        console.log('Current Tables:', tables);

        const expected = [
            'citizens',
            'land_records',
            'nid_cards',
            'passport_books',
            'reg_info',
            'service_requests',
            'tax_payers',
            'todos'
        ].sort();

        const extra = tables.filter(t => !expected.includes(t));
        const missing = expected.filter(t => !tables.includes(t));

        if (extra.length === 0 && missing.length === 0) {
            console.log('SUCCESS: Database contains exactly the expected tables.');
        } else {
            if (extra.length > 0) console.log('WARNING: Extra tables found:', extra);
            if (missing.length > 0) console.log('ERROR: Missing tables:', missing);
            process.exit(1);
        }
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

verifyFinalTables();
