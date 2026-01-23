const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
});

db.connect((err) => {
    if (err) {
        console.error('Connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to database.');

    // Direct SQL to fix the specific constraint reported in the error log
    const sql = `
        -- Safety check: ensure ordered_item exists
        CREATE TABLE IF NOT EXISTS ordered_item (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_nid VARCHAR(50) NOT NULL,
            total_amount DECIMAL(10, 2) NOT NULL,
            payment_method ENUM('COD', 'ONLINE') NOT NULL,
            payment_status ENUM('PENDING', 'PAID', 'FAILED') DEFAULT 'PENDING',
            delivery_address TEXT NOT NULL,
            contact_number VARCHAR(20) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_nid) REFERENCES reg_info(nid) ON DELETE CASCADE
        );

        -- Drop the bad constraint
        ALTER TABLE order_items DROP FOREIGN KEY order_items_ibfk_1;
        
        -- Add the correct constraint
        ALTER TABLE order_items 
        ADD CONSTRAINT fk_order_items_ordered_item 
        FOREIGN KEY (order_id) REFERENCES ordered_item(id) ON DELETE CASCADE;
    `;

    db.query(sql, (err) => {
        if (err) {
            console.error('Error fixing constraints:', err.message);
            // Fallback: If dropping fails (e.g. name differs), try dropping table entirely
            if (err.message.includes("check that column/key exists")) {
                console.log("Constraint check failed, trying to drop table order_items to reset...");
                db.query("DROP TABLE IF EXISTS order_items", (e2) => {
                    if (e2) {
                        console.error("Failed to drop table:", e2);
                    } else {
                        console.log("Table dropped. Re-run init_shop_db.js or rely on previous schema apply.");
                        // We could re-create it here to be safe
                        const createSql = `
                            CREATE TABLE order_items (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                order_id INT NOT NULL,
                                item_id INT NOT NULL,
                                quantity INT NOT NULL,
                                price_at_time DECIMAL(10, 2) NOT NULL,
                                FOREIGN KEY (order_id) REFERENCES ordered_item(id) ON DELETE CASCADE,
                                FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE
                            )
                         `;
                        db.query(createSql, (e3) => {
                            if (e3) console.error("Re-create failed:", e3);
                            else console.log("Table order_items re-created correctly.");
                            db.end();
                        })
                        return; // Return here to avoid double end
                    }
                    db.end();
                });
                return;
            }
        } else {
            console.log('Constraints fixed successfully!');
        }
        db.end();
    });
});
