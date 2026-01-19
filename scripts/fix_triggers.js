const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'central_govt_db',
    multipleStatements: true
};

async function fixTriggers() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        const sql = `
            DROP TRIGGER IF EXISTS tr_service_request_status_change;
            
            CREATE TRIGGER tr_service_request_status_change
            AFTER UPDATE ON service_requests
            FOR EACH ROW
            BEGIN
                IF OLD.status != NEW.status THEN
                    INSERT INTO notifications (user_id, message)
                    VALUES (
                        NEW.user_id,
                        CONCAT('Service Request ', UPPER(LEFT(NEW.status, 1)), LOWER(SUBSTRING(NEW.status, 2)), ': Your ', NEW.service_type, ' request has been ', NEW.status, '.')
                    );
                END IF;
            END;

            DROP TRIGGER IF EXISTS tr_member_join_notify;

            CREATE TRIGGER tr_member_join_notify
            AFTER INSERT ON community_members
            FOR EACH ROW
            BEGIN
                DECLARE v_member_name VARCHAR(255);
                DECLARE v_group_creator INT;
                
                -- Get member name
                SELECT name INTO v_member_name FROM reg_info WHERE id = NEW.user_id LIMIT 1;
                
                -- Get group creator
                SELECT created_by INTO v_group_creator FROM community_groups WHERE id = NEW.group_id LIMIT 1;
                
                -- Notify group creator (if not the same user)
                IF v_group_creator IS NOT NULL AND v_group_creator != NEW.user_id THEN
                    INSERT INTO notifications (user_id, message)
                    VALUES (
                        v_group_creator,
                        CONCAT('New Member Joined: ', COALESCE(v_member_name, 'Someone'), ' joined your group!')
                    );
                END IF;
            END;
        `;

        console.log('Applying trigger fixes...');
        await connection.query(sql);
        console.log('Triggers fixed successfully!');

    } catch (error) {
        console.error('Error fixing triggers:', error);
    } finally {
        if (connection) await connection.end();
    }
}

fixTriggers();

