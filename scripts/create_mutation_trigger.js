/**
 * Script to create the land mutation approval trigger
 * Run with: node scripts/create_mutation_trigger.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTrigger() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'central_portal',
        multipleStatements: true
    });

    try {
        console.log('Connected to database...');

        // First, drop the trigger if it exists (can't use IF EXISTS in MySQL triggers easily)
        try {
            await connection.query('DROP TRIGGER IF EXISTS after_mutation_approval');
            console.log('Dropped existing trigger (if any)...');
        } catch (err) {
            // Ignore if trigger doesn't exist
        }

        // Create the trigger
        const triggerSQL = `
            CREATE TRIGGER after_mutation_approval
            AFTER UPDATE ON land_mutations_v2
            FOR EACH ROW
            BEGIN
                DECLARE buyer_user_id INT;
                DECLARE seller_record_id INT;
                DECLARE seller_current_size DECIMAL(10, 2);
                DECLARE div_name VARCHAR(255);
                DECLARE dist_name VARCHAR(255);
                DECLARE upz_name VARCHAR(255);
                
                -- Only proceed if status changed TO 'Approved'
                IF NEW.status = 'Approved' AND (OLD.status != 'Approved' OR OLD.status IS NULL) THEN
                    
                    -- Get buyer's user_id from reg_info based on buyer_nid
                    SELECT id INTO buyer_user_id FROM reg_info WHERE nid = NEW.buyer_nid LIMIT 1;
                    
                    -- Only proceed if buyer exists in the system
                    IF buyer_user_id IS NOT NULL THEN
                        
                        -- Get division, district, upazila names
                        SELECT name INTO div_name FROM divisions WHERE id = NEW.division_id LIMIT 1;
                        SELECT name INTO dist_name FROM districts WHERE id = NEW.district_id LIMIT 1;
                        SELECT name INTO upz_name FROM upazilas WHERE id = NEW.upazila_id LIMIT 1;
                        
                        -- Check if buyer already has this land record
                        IF NOT EXISTS (
                            SELECT 1 FROM my_land_record 
                            WHERE user_id = buyer_user_id 
                            AND khatian_no = NEW.khatian_no 
                            AND dag_no = NEW.dag_no
                        ) THEN
                            -- Add land to buyer's record
                            INSERT INTO my_land_record 
                                (user_id, division, district, upazila, owner_name, father_name, mother_name, nid, khatian_no, dag_no, mouza, land_size, deed_no, land_price, ownership_description, status)
                            VALUES 
                                (buyer_user_id, div_name, dist_name, upz_name, NEW.buyer_name, NEW.buyer_father_name, NEW.buyer_mother_name, NEW.buyer_nid, NEW.khatian_no, NEW.dag_no, 'Mutation Transfer', NEW.land_amount, IFNULL(NEW.deed_no, 'N/A'), NEW.land_price, CONCAT('Purchased via Mutation (Tracking: ', NEW.tracking_number, ')'), 'Approved');
                        END IF;
                        
                        -- Get seller's record info
                        SELECT id, land_size INTO seller_record_id, seller_current_size 
                        FROM my_land_record 
                        WHERE user_id = NEW.user_id 
                        AND khatian_no = NEW.khatian_no 
                        AND dag_no = NEW.dag_no 
                        LIMIT 1;
                        
                        -- Update or delete seller's record
                        IF seller_record_id IS NOT NULL THEN
                            IF NEW.land_amount >= seller_current_size - 0.0001 THEN
                                -- Full transfer - delete seller's record
                                DELETE FROM my_land_record WHERE id = seller_record_id;
                            ELSE
                                -- Partial transfer - reduce seller's land size
                                UPDATE my_land_record 
                                SET land_size = seller_current_size - NEW.land_amount 
                                WHERE id = seller_record_id;
                            END IF;
                        END IF;
                        
                        -- Also update service_requests status if exists
                        UPDATE service_requests 
                        SET status = 'approved' 
                        WHERE details LIKE CONCAT('%', NEW.tracking_number, '%') 
                        AND status = 'pending';
                        
                    END IF;
                END IF;
            END
        `;

        await connection.query(triggerSQL);
        console.log('✅ Trigger "after_mutation_approval" created successfully!');

        // Verify the trigger was created
        const [triggers] = await connection.query(
            "SHOW TRIGGERS WHERE `Table` = 'land_mutations_v2'"
        );
        console.log('\nActive triggers on land_mutations_v2:');
        triggers.forEach(t => console.log(`  - ${t.Trigger} (${t.Event} ${t.Timing})`));

    } catch (error) {
        console.error('❌ Error creating trigger:', error.message);
        console.error('Full error:', error);
    } finally {
        await connection.end();
    }
}

createTrigger();
