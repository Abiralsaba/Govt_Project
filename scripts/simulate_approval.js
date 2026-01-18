const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });
const pool = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });

async function simulateApproval() {
    try {
        const requestId = 22;
        const userId = 11; // Seller's ID as per debug
        const status = 'approved';

        console.log(`Simulating Approval for Request ${requestId} by User ${userId}`);

        // 1. Fetch Request
        const [reqData] = await pool.query('SELECT * FROM service_requests WHERE id = ? AND user_id = ?', [requestId, userId]);

        if (reqData.length === 0) {
            console.error('Request not found (or user mismatch)');
            process.exit(1);
        }

        const request = reqData[0];
        console.log('Request Found:', request);

        // 2. Logic from Controller
        const uniqueIdMatch = request.details.match(/ID: ([\w-]+) -/);
        const uniqueId = uniqueIdMatch ? uniqueIdMatch[1] : null;

        console.log(`Extracted UniqueID: ${uniqueId}`);

        if (request.service_type === 'Land Mutation') {
            if (uniqueId) {
                // Update Service Request status (The fix)
                await pool.query('UPDATE service_requests SET status = ? WHERE id = ?', [status, requestId]);
                console.log('Updated service_requests status');

                // Update mutation status in land_mutations_v2
                await pool.query('UPDATE land_mutations_v2 SET status = ? WHERE tracking_number = ?', [status, uniqueId]);
                console.log('Updated land_mutations_v2 status');

                // If Approved, Remove from Seller's Record
                if (status === 'Approved' || status === 'approved') {
                    const [mutations] = await pool.query('SELECT * FROM land_mutations_v2 WHERE tracking_number = ?', [uniqueId]);

                    if (mutations.length > 0) {
                        const mut = mutations[0];
                        const sellerId = mut.user_id; // The seller
                        console.log(`Mutation Found. Seller: ${sellerId}, Buyer NID: ${mut.buyer_nid}`);

                        // Fetch Seller's Land Record
                        const [sellerRecords] = await pool.query(
                            'SELECT * FROM my_land_record WHERE user_id = ? AND khatian_no = ? AND dag_no = ?',
                            [sellerId, mut.khatian_no, mut.dag_no]
                        );
                        console.log(`Seller Records Found: ${sellerRecords.length}`);

                        if (sellerRecords.length > 0) {
                            const record = sellerRecords[0];
                            const sellAmount = parseFloat(mut.land_amount);
                            const currentSize = parseFloat(record.land_size);

                            console.log(`Selling: ${sellAmount}, Current: ${currentSize}`);

                            if (!isNaN(sellAmount) && !isNaN(currentSize)) {
                                // Use epsilon for float comparison
                                const epsilon = 0.0001;
                                if (sellAmount >= currentSize - epsilon) {
                                    // Full Sale -> Delete Record
                                    await pool.query('DELETE FROM my_land_record WHERE id = ?', [record.id]);
                                    console.log(`Deleted Land Record ${record.id} for Seller ${sellerId} (Full Transfer)`);
                                } else {
                                    // Partial Sale -> Update Size
                                    const newSize = currentSize - sellAmount;
                                    await pool.query('UPDATE my_land_record SET land_size = ? WHERE id = ?', [newSize, record.id]);
                                    console.log(`Updated Land Record ${record.id} for Seller ${sellerId} (Partial Transfer: ${newSize})`);
                                }

                                // TRANSFER TO BUYER
                                const [buyerUser] = await pool.query('SELECT id FROM reg_info WHERE nid = ?', [mut.buyer_nid]);

                                if (buyerUser.length > 0) {
                                    const buyerId = buyerUser[0].id;
                                    console.log(`Buyer Found: User ID ${buyerId}`);

                                    await pool.query(`
                                            INSERT INTO my_land_record 
                                            (user_id, division, district, upazila, owner_name, father_name, mother_name, nid, khatian_no, dag_no, mouza, land_size, deed_no, land_price, ownership_description, status)
                                            VALUES (?, 
                                                (SELECT name FROM divisions WHERE id=?), 
                                                (SELECT name FROM districts WHERE id=?), 
                                                (SELECT name FROM upazilas WHERE id=?), 
                                                ?, ?, ?, ?, ?, ?, 'Mutation Transfer', ?, ?, ?, ?, 'Approved')
                                        `, [
                                        buyerId, mut.division_id, mut.district_id, mut.upazila_id,
                                        mut.buyer_name, mut.buyer_father_name, mut.buyer_mother_name, mut.buyer_nid,
                                        mut.khatian_no, mut.dag_no,
                                        sellAmount, mut.deed_no || 'N/A', mut.land_price,
                                        `Purchased via Mutation (Tracking: ${uniqueId})`
                                    ]);
                                    console.log(`Created New Land Record for Buyer ${buyerId}`);
                                } else {
                                    console.log(`Buyer NID ${mut.buyer_nid} not found.`);
                                }
                            }
                        } else {
                            console.log('No matching seller record found.');
                        }
                    }
                }
            } else { console.log('UniqueID not found in details'); }
        } else { console.log('Service Type mismatch'); }

        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
}
simulateApproval();
