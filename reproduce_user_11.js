const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:3000/api';
const SECRET = 'your-secret-key'; // From .env

async function reproduce() {
    try {
        // Forge token for User 11
        const token = jwt.sign({ id: 11, username: 'test', nid: 'unknown' }, SECRET, { expiresIn: '1h' });
        console.log('Forged token for User 11');

        const itemId = 1; // Assuming item 1 exists

        // Add to Cart
        console.log('Adding to cart...');
        try {
            const cartRes = await axios.post(`${BASE_URL}/shop/cart`, {
                item_id: itemId,
                quantity: 1
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Add to cart response:', cartRes.data);
        } catch (error) {
            console.error('Add to cart FAILED:', error.response ? error.response.data : error.message);
        }

    } catch (error) {
        console.error('An error occurred:', error);
    }
}

reproduce();
