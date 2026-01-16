const db = require('../src/config/db');

const tables = [
    'req_nid_correction', 'req_birth_cert_correction', 'req_death_cert_correction', 'req_character_certificate', 'req_income_certificate',
    'req_education_sss', 'req_education_hsc', 'req_education_jsc', 'req_education_university_verification', 'req_education_transcript',
    'req_transport_driving_lic_correction', 'req_transport_driving_lic_renew', 'req_transport_vehicle_reg_correction', 'req_transport_ownership_transfer',
    'req_immigration_visa', 'req_immigration_passport_correction', 'req_immigration_emigration_clearance',
    'req_business_trade_lic', 'req_business_tin_certificate', 'req_business_vat_reg', 'req_business_company_reg', 'req_business_import_export',
    'req_legal_gd', 'req_legal_case', 'req_legal_complain'
];

async function updateTables() {
    console.log('Adding evidence_link column to tables...');
    try {
        const connection = await db.getConnection();

        for (const table of tables) {
            try {
                // Check if column exists first to avoid errors? Or just try ADD COLUMN and ignore specific error?
                // Simpler to just try ADD
                const query = `ALTER TABLE ${table} ADD COLUMN evidence_link TEXT AFTER description`;
                await connection.query(query);
                console.log(`Updated table: ${table}`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Column already exists in: ${table}`);
                } else {
                    console.error(`Error updating ${table}:`, err.message);
                }
            }
        }

        // Also update the general service_requests table if we are using it for history
        try {
            await connection.query(`ALTER TABLE service_requests ADD COLUMN evidence_link TEXT`);
            console.log('Updated general service_requests table');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') console.error('Error updating service_requests:', err.message);
        }

        connection.release();
        console.log('Database update complete.');
        process.exit(0);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

updateTables();
