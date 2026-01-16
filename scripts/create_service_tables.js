const db = require('../src/config/db');

const tables = [
    'req_nid_correction', 'req_birth_cert_correction', 'req_death_cert_correction', 'req_character_certificate', 'req_income_certificate',
    'req_education_sss', 'req_education_hsc', 'req_education_jsc', 'req_education_university_verification', 'req_education_transcript',
    'req_transport_driving_lic_correction', 'req_transport_driving_lic_renew', 'req_transport_vehicle_reg_correction', 'req_transport_ownership_transfer',
    'req_immigration_visa', 'req_immigration_passport_correction', 'req_immigration_emigration_clearance',
    'req_business_trade_lic', 'req_business_tin_certificate', 'req_business_vat_reg', 'req_business_company_reg', 'req_business_import_export',
    'req_legal_gd', 'req_legal_case', 'req_legal_complain'
];

async function createTables() {
    console.log('Creating Service Request Tables...');
    try {
        const connection = await db.getConnection();

        for (const table of tables) {
            const query = `
                CREATE TABLE IF NOT EXISTS ${table} (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    unique_number VARCHAR(255) NOT NULL,
                    description TEXT,
                    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
                )
            `;
            await connection.query(query);
            console.log(`Table created/verified: ${table}`);
        }

        connection.release();
        console.log('All tables created successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error creating tables:', error);
        process.exit(1);
    }
}

createTables();
