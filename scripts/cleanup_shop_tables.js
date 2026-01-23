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

    const sql = `
        -- ==========================================
        -- STEP 1: Drop all old/duplicate shop tables
        -- ==========================================
        DROP TABLE IF EXISTS order_items;
        DROP TABLE IF EXISTS orders;
        DROP TABLE IF EXISTS ordered_item;
        DROP TABLE IF EXISTS addto_cart;
        DROP TABLE IF EXISTS cart_items;
        
        -- ==========================================
        -- STEP 2: Keep shop_items as-is (or recreate if missing)
        -- ==========================================
        CREATE TABLE IF NOT EXISTS shop_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10, 2) NOT NULL,
            image_url VARCHAR(500),
            stock_quantity INT DEFAULT 100,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- ==========================================
        -- STEP 3: Create cart_item table
        -- ==========================================
        CREATE TABLE IF NOT EXISTS cart_item (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            product_id INT NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            quantity INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES shop_items(id) ON DELETE CASCADE
        );
        
        -- ==========================================
        -- STEP 4: Create Ordered_item table
        -- ==========================================
        CREATE TABLE IF NOT EXISTS Ordered_item (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            user_nid VARCHAR(50),
            total_amount DECIMAL(10, 2) NOT NULL,
            payment_method ENUM('COD', 'ONLINE') NOT NULL,
            payment_status ENUM('PENDING', 'PAID', 'FAILED') DEFAULT 'PENDING',
            delivery_address TEXT NOT NULL,
            contact_number VARCHAR(20) NOT NULL,
            product_details JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
        );
        
        -- ==========================================
        -- STEP 5: Re-insert sample shop items if empty
        -- ==========================================
        INSERT INTO shop_items (name, description, price, image_url) 
        SELECT * FROM (
            SELECT 'Constitution of Bangladesh' as name, 'Official bilingual edition' as description, 250.00 as price, '<i class="fas fa-book"></i>' as image_url
        ) AS tmp
        WHERE NOT EXISTS (SELECT id FROM shop_items LIMIT 1);
        
        INSERT INTO shop_items (name, description, price, image_url) 
        SELECT * FROM (
            SELECT 'Souvenir T-Shirt', '"I Love my Country"', 500.00, '<i class="fas fa-tshirt"></i>'
        ) AS tmp
        WHERE NOT EXISTS (SELECT id FROM shop_items WHERE name = 'Souvenir T-Shirt' LIMIT 1);
        
        INSERT INTO shop_items (name, description, price, image_url) 
        SELECT * FROM (
            SELECT 'Eco Mug', 'Bamboo fiber mug', 300.00, '<i class="fas fa-mug-hot"></i>'
        ) AS tmp
        WHERE NOT EXISTS (SELECT id FROM shop_items WHERE name = 'Eco Mug' LIMIT 1);
        
        INSERT INTO shop_items (name, description, price, image_url) 
        SELECT * FROM (
            SELECT 'National Flag', 'Standard Size (Cotton)', 150.00, '<i class="fas fa-flag"></i>'
        ) AS tmp
        WHERE NOT EXISTS (SELECT id FROM shop_items WHERE name = 'National Flag' LIMIT 1);
    `;

    db.query(sql, (err) => {
        if (err) {
            console.error('Error executing schema:', err);
        } else {
            console.log('✓ Shop database schema cleaned and recreated successfully!');
            console.log('  - Dropped: order_items, orders, ordered_item, addto_cart, cart_items');
            console.log('  - Created: shop_items, cart_item, Ordered_item');
        }
        db.end();
    });
});
