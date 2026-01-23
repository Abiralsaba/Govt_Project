const db = require('../src/config/db');

async function migrate() {
    try {
        console.log('Altering stipends_applications table to include Pending status...');
        await db.query(`
            ALTER TABLE stipends_applications 
            MODIFY COLUMN status ENUM('Draft', 'Submitted', 'Pending', 'Under Review', 'Approved', 'Rejected') DEFAULT 'Pending'
        `);
        console.log('Migration successful.');

        // Optionally update existing 'Submitted' to 'Pending' if desired?
        // User said "initially pending", so maybe update old ones too?
        // Let's keep it safe and just support Pending for new ones, but maybe update old ones for consistency.
        console.log('Updating existing Submitted applications to Pending...');
        await db.query(`UPDATE stipends_applications SET status = 'Pending' WHERE status = 'Submitted'`);
        console.log('Update successful.');

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
