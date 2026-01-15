const pool = require('../src/config/db');

async function testConnection() {
    try {
        console.log('Testing database connection...');
        console.log('Configuration:');
        console.log('- Host:', process.env.DB_HOST || 'localhost');
        console.log('- User:', process.env.DB_USER || 'root');
        console.log('- Database:', process.env.DB_NAME || 'central_govt_db');
        console.log('');

        // Test connection
        const connection = await pool.getConnection();
        console.log('✅ Successfully connected to MySQL database!');

        // Test query
        const [rows] = await connection.query('SELECT 1 + 1 AS result');
        console.log('✅ Test query successful:', rows[0]);

        // Check if database exists
        const [databases] = await connection.query('SHOW DATABASES');
        const dbExists = databases.some(db => db.Database === (process.env.DB_NAME || 'central_govt_db'));

        if (dbExists) {
            console.log('✅ Database "' + (process.env.DB_NAME || 'central_govt_db') + '" exists');

            // Show tables
            const [tables] = await connection.query('SHOW TABLES');
            console.log('\nTables in database:');
            if (tables.length === 0) {
                console.log('⚠️  No tables found in database');
            } else {
                tables.forEach(table => {
                    console.log('  -', Object.values(table)[0]);
                });
            }
        } else {
            console.log('⚠️  Database "' + (process.env.DB_NAME || 'central_govt_db') + '" does not exist');
            console.log('\nAvailable databases:');
            databases.forEach(db => {
                console.log('  -', db.Database);
            });
        }

        connection.release();
        console.log('\n✅ Connection test completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Make sure XAMPP MySQL is running');
        console.error('2. Check your .env file configuration');
        console.error('3. Verify MySQL is running on port 3306');
        process.exit(1);
    }
}

testConnection();
