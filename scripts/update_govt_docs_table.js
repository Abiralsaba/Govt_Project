
const db = require('../src/config/db');

async function updateTable() {
    try {
        await db.query(`
            ALTER TABLE govt_user_documents
            ADD COLUMN identity_number VARCHAR(50) AFTER doc_category;
        `);
        console.log('govt_user_documents table updated successfully!');
        process.exit();
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column already exists.');
        } else {
            console.error('Error updating table:', error);
        }
        process.exit(1);
    }
}

updateTable();
