const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function reproduce() {
    try {
        console.log('--- RESETTING DATA FOR REPRODUCTION ---');
        await pool.query('UPDATE service_requests SET status = "pending" WHERE id = 23');
        await pool.query('UPDATE land_mutations_v2 SET status = "Pending" WHERE id = 13');
        await pool.query('DELETE FROM my_land_record WHERE user_id = 11 AND khatian_no = "123"');
        await pool.query(`INSERT INTO my_land_record 
            (user_id, khatian_no, dag_no, land_size, status, division, district, upazila, mouza, owner_name, father_name, mother_name, nid) 
            VALUES (11, "123", "1222", "22.0000", "Approved", "Dhaka", "Dhaka", "Savar", "Test", "Seller", "F", "M", "111")`);
        await pool.query('DELETE FROM my_land_record WHERE user_id = 12 AND khatian_no = "123"');

        console.log('--- DATA RESET COMPLETE ---');

        const requestId = 23;
        const status = 'approved';
        const uniqueId = 'LMT-2026-3330';

        console.log(`Processing Request ${requestId} (Mutation: ${uniqueId})`);

        await pool.query('UPDATE service_requests SET status = ? WHERE id = ?', [status, requestId]);
        await pool.query('UPDATE land_mutations_v2 SET status = ? WHERE tracking_number = ?', [status, uniqueId]);

        const [mutations] = await pool.query('SELECT * FROM land_mutations_v2 WHERE tracking_number = ?', [uniqueId]);
        if (mutations.length === 0) { console.error('MUTATION NOT FOUND!'); process.exit(1); }

        const mut = mutations[0];
        console.log(`Mutation Found: Buyer NID ${mut.buyer_nid}, Seller ID ${mut.user_id}`);

        const [sellerRecords] = await pool.query(
            'SELECT * FROM my_land_record WHERE user_id = ? AND khatian_no = ? AND dag_no = ?',
            [mut.user_id, mut.khatian_no, mut.dag_no]
        );

        console.log(`Seller Records Found: ${sellerRecords.length}`);
        if (sellerRecords.length > 0) {
            const record = sellerRecords[0];
            const matAmount = parseFloat(mut.land_amount);
            const currentSize = parseFloat(record.land_size);

            console.log(`Math: Sell ${matAmount} vs Current ${currentSize}`);
            if (matAmount >= currentSize - 0.0001) {
                console.log('FULL DELETE TRIGGERED');
                await pool.query('DELETE FROM my_land_record WHERE id = ?', [record.id]);
            } else {
                console.log('PARTIAL UPDATE TRIGGERED');
                await pool.query('UPDATE my_land_record SET land_size = ? WHERE id = ?', [currentSize - matAmount, record.id]);
            }

            const [buyerUser] = await pool.query('SELECT id FROM reg_info WHERE nid = ?', [mut.buyer_nid]);
            console.log(`Buyer Lookup: ${JSON.stringify(buyerUser)}`);

            if (buyerUser.length > 0) {
                const buyerId = buyerUser[0].id;
                try {
                    await pool.query(`INSERT INTO my_land_record (user_id, division, district, upazila, owner_name, father_name, mother_name, nid, khatian_no, dag_no, mouza, land_size, deed_no, land_price, ownership_description, status) VALUES (?, (SELECT name FROM divisions WHERE id=?), (SELECT name FROM districts WHERE id=?), (SELECT name FROM upazilas WHERE id=?), ?, ?, ?, ?, ?, ?, 'Mutation Transfer', ?, ?, ?, ?, 'Approved')`, [buyerId, mut.division_id, mut.district_id, mut.upazila_id, mut.buyer_name, mut.buyer_father_name, mut.buyer_mother_name, mut.buyer_nid, mut.khatian_no, mut.dag_no, matAmount, mut.deed_no || 'N/A', mut.land_price, `Purchased via Mutation (Tracking: ${uniqueId})`]);
                    console.log('SUCCESS: Buyer Record Created');
                } catch (err) { console.error('ERROR INSERTING BUYER RECORD:', err); }
            } else { console.error('BUYER NOT FOUND'); }
        } else { console.error('SELLER RECORD NOT FOUND'); }
        process.exit(0);
    } catch (e) {
        console.error('GLOBAL ERROR:', e);
        process.exit(1);
    }
}
reproduce();
