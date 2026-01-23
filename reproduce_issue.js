const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function reproduce() {
    try {
        const rand = Math.floor(Math.random() * 10000);
        const user = {
            username: `testuser${rand}`,
            email: `test${rand}@example.com`,
            password: 'password123',
            nid: `1234567890${rand}`,
            mobile: '01700000000',
            dob: '1990-01-01',
            gender: 'Male',
            address: 'Dhaka'
        };

        console.log('Registering user...');
        await axios.post(`${BASE_URL}/auth/register`, user);
        console.log('User registered.');

        console.log('Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: user.email,
            password: user.password
        });
        const token = loginRes.data.token;
        console.log('Logged in. Token received.');

        // Get Shop Items to find an ID
        console.log('Fetching shop items...');
        const itemsRes = await axios.get(`${BASE_URL}/shop/items`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (itemsRes.data.length === 0) {
            console.error('No items found in shop.');
            return;
        }

        const itemId = itemsRes.data[0].id;
        console.log(`Found item ID: ${itemId}`);

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
        console.error('An error occurred:', error.response ? error.response.data : error.message);
    }
}

reproduce();
