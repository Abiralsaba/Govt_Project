const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'central_govt'
};

const locations = [
    {
        division: "Barishal",
        districts: [
            { name: "Barguna", upazilas: ["Amtali", "Bamna", "Barguna Sadar", "Betagi", "Patharghata", "Taltali"] },
            { name: "Barishal", upazilas: ["Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Barishal Sadar", "Gaurnadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur"] },
            { name: "Bhola", upazilas: ["Bhola Sadar", "Burhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"] },
            { name: "Jhalokati", upazilas: ["Jhalokati Sadar", "Kathalia", "Nalchity", "Rajapur"] },
            { name: "Patuakhali", upazilas: ["Bauphal", "Dashmina", "Dumki", "Galachipa", "Kalapara", "Mirzaganj", "Patuakhali Sadar", "Rangabali"] },
            { name: "Pirojpur", upazilas: ["Bhandaria", "Indurkani (Zianagar)", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad (Swarupkati)", "Pirojpur Sadar"] }
        ]
    },
    {
        division: "Chattogram",
        districts: [
            { name: "Bandarban", upazilas: ["Ali Kadam", "Bandarban Sadar", "Lama", "Naikhongchhari", "Rowangchhari", "Ruma", "Thanchi"] },
            { name: "Brahmanbaria", upazilas: ["Akhaura", "Ashuganj", "Bancharampur", "Bijoynagar", "Brahmanbaria Sadar", "Kasba", "Nabinagar", "Nasirnagar", "Sarail"] },
            { name: "Chandpur", upazilas: ["Chandpur Sadar", "Faridganj", "Haimchar", "Hajiganj", "Kachua", "Matlab Dakshin", "Matlab Uttar", "Shahrasti"] },
            { name: "Chattogram", upazilas: ["Anwara", "Banshkhali", "Boalkhali", "Chandanaish", "Fatikchhari", "Hathazari", "Karnaphuli", "Lohagara", "Mirsharai", "Patiya", "Rangunia", "Raozan", "Sandwip", "Satkania", "Sitakunda"] },
            { name: "Cox's Bazar", upazilas: ["Chakaria", "Cox's Bazar Sadar", "Eidgaon", "Kutubdia", "Maheshkhali", "Pekua", "Ramu", "Teknaf", "Ukhia"] },
            { name: "Cumilla", upazilas: ["Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Cumilla Sadar", "Cumilla Sadar Dakshin", "Daudkandi", "Debidwar", "Homna", "Laksam", "Lalmai", "Meghna", "Monohargonj", "Muradnagar", "Nangalkot", "Titas"] },
            { name: "Feni", upazilas: ["Chhagalnaiya", "Daganbhuiyan", "Feni Sadar", "Fulgazi", "Parshuram", "Sonagazi"] },
            { name: "Khagrachhari", upazilas: ["Dighinala", "Guimara", "Khagrachhari Sadar", "Lakshmichhari", "Mahalchhari", "Manikchhari", "Matiranga", "Panchhari", "Ramgarh"] },
            { name: "Lakshmipur", upazilas: ["Kamalnagar", "Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati"] },
            { name: "Noakhali", upazilas: ["Begumganj", "Chatkhil", "Companiganj", "Hatiya", "Kabirhat", "Noakhali Sadar", "Senbagh", "Sonaimuri", "Subarnachar"] },
            { name: "Rangamati", upazilas: ["Baghaichhari", "Barkal", "Belaichhari", "Juraichhari", "Kaptai", "Kawkhali", "Langadu", "Naniarchar", "Rajasthali", "Rangamati Sadar"] }
        ]
    },
    {
        division: "Dhaka",
        districts: [
            { name: "Dhaka", upazilas: ["Dhamrai", "Dohar", "Keraniganj", "Nawabganj", "Savar"] },
            { name: "Faridpur", upazilas: ["Alfadanga", "Bhanga", "Boalmari", "Char Bhadrasan", "Faridpur Sadar", "Madhukhali", "Nagarkanda", "Sadarpur", "Saltha"] },
            { name: "Gazipur", upazilas: ["Gazipur Sadar", "Kaliakair", "Kaliganj", "Kapasia", "Sreepur"] },
            { name: "Gopalganj", upazilas: ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"] },
            { name: "Kishoreganj", upazilas: ["Austagram", "Bajitpur", "Bhairab", "Hossainpur", "Itna", "Karimganj", "Katiadi", "Kishoreganj Sadar", "Kuliarchar", "Mithamain", "Nikli", "Pakundia", "Tarail"] },
            { name: "Madaripur", upazilas: ["Dasar", "Kalkini", "Madaripur Sadar", "Rajoir", "Shibchar"] },
            { name: "Manikganj", upazilas: ["Daulatpur", "Ghior", "Harirampur", "Manikganj Sadar", "Saturia", "Shibalaya", "Singair"] },
            { name: "Munshiganj", upazilas: ["Gazaria", "Lauhajang", "Munshiganj Sadar", "Serajdikhan", "Sreenagar", "Tongibari"] },
            { name: "Narayanganj", upazilas: ["Araihazar", "Bandar", "Narayanganj Sadar", "Rupganj", "Sonargaon"] },
            { name: "Narsingdi", upazilas: ["Belabo", "Monohardi", "Narsingdi Sadar", "Palash", "Raipura", "Shibpur"] },
            { name: "Rajbari", upazilas: ["Baliakandi", "Goalanda", "Kalukhali", "Pangsha", "Rajbari Sadar"] },
            { name: "Shariatpur", upazilas: ["Bhedarganj", "Damudya", "Gosairhat", "Naria", "Shariatpur Sadar", "Zajira"] },
            { name: "Tangail", upazilas: ["Basail", "Bhuapur", "Delduar", "Dhanbari", "Ghatail", "Gopalpur", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Tangail Sadar"] }
        ]
    },
    {
        division: "Khulna",
        districts: [
            { name: "Bagerhat", upazilas: ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"] },
            { name: "Chuadanga", upazilas: ["Alamdanga", "Chuadanga Sadar", "Damurhuda", "Jibannagar"] },
            { name: "Jashore", upazilas: ["Abhaynagar", "Bagherpara", "Chaugachha", "Jashore Sadar", "Jhikargachha", "Keshabpur", "Manirampur", "Sharsha"] },
            { name: "Jhenaidah", upazilas: ["Harinakunda", "Jhenaidah Sadar", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa"] },
            { name: "Khulna", upazilas: ["Batiaghata", "Dacope", "Dumuria", "Dighalia", "Koyra", "Paikgachha", "Phultala", "Rupsha", "Terokhada"] },
            { name: "Kushtia", upazilas: ["Bheramara", "Daulatpur", "Khoksa", "Kumarkhali", "Kushtia Sadar", "Mirpur"] },
            { name: "Magura", upazilas: ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"] },
            { name: "Meherpur", upazilas: ["Gangni", "Meherpur Sadar", "Mujibnagar"] },
            { name: "Narail", upazilas: ["Kalia", "Lohagara", "Narail Sadar"] },
            { name: "Satkhira", upazilas: ["Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Satkhira Sadar", "Shyamnagar", "Tala"] }
        ]
    },
    {
        division: "Mymensingh",
        districts: [
            { name: "Jamalpur", upazilas: ["Bakshiganj", "Dewanganj", "Islampur", "Jamalpur Sadar", "Madarganj", "Melandaha", "Sarishabari"] },
            { name: "Mymensingh", upazilas: ["Bhaluka", "Dhobaura", "Fulbaria", "Gaffargaon", "Gauripur", "Haluaghat", "Ishwarganj", "Mymensingh Sadar", "Muktagachha", "Nandail", "Phulpur", "Tarakanda", "Trishal"] },
            { name: "Netrokona", upazilas: ["Atpara", "Barhatta", "Durgapur", "Khaliajuri", "Kalmakanda", "Kendua", "Madan", "Mohanganj", "Netrokona Sadar", "Purbadhala"] },
            { name: "Sherpur", upazilas: ["Jhenaigati", "Nakla", "Nalitabari", "Sherpur Sadar", "Sreebardi"] }
        ]
    },
    {
        division: "Rajshahi",
        districts: [
            { name: "Bogura", upazilas: ["Adamdighi", "Bogura Sadar", "Dhunat", "Dhupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Shajahanpur", "Sherpur", "Shibganj", "Sonatala"] },
            { name: "Chapai Nawabganj", upazilas: ["Bholahat", "Chapai Nawabganj Sadar", "Gomastapur", "Nachole", "Shibganj"] },
            { name: "Joypurhat", upazilas: ["Akkelpur", "Joypurhat Sadar", "Kalai", "Khetlal", "Panchbibi"] },
            { name: "Naogaon", upazilas: ["Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mohadevpur", "Naogaon Sadar", "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar"] },
            { name: "Natore", upazilas: ["Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Naldanga", "Natore Sadar", "Singra"] },
            { name: "Pabna", upazilas: ["Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Pabna Sadar", "Santhia", "Sujanagar"] },
            { name: "Rajshahi", upazilas: ["Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Paba", "Puthia", "Tanore"] },
            { name: "Sirajganj", upazilas: ["Belkuchi", "Chauhali", "Kamarkhanda", "Kazipur", "Raiganj", "Shahjadpur", "Sirajganj Sadar", "Tarash", "Ullahpara"] }
        ]
    },
    {
        division: "Rangpur",
        districts: [
            { name: "Dinajpur", upazilas: ["Birampur", "Birganj", "Biral", "Bochaganj", "Chirirbandar", "Dinajpur Sadar", "Ghoraghat", "Hakimpur", "Kaharole", "Khansama", "Nawabganj", "Parbatipur", "Phulbari"] },
            { name: "Gaibandha", upazilas: ["Gaibandha Sadar", "Gobindaganj", "Palashbari", "Phulchhari", "Sadullapur", "Sughatta", "Sundarganj"] },
            { name: "Kurigram", upazilas: ["Bhurungamari", "Char Rajibpur", "Chilmari", "Kurigram Sadar", "Nageshwari", "Phulbari", "Rajarhat", "raumari", "Ulipur"] },
            { name: "Lalmonirhat", upazilas: ["Aditmari", "Hatibandha", "Kaliganj", "Lalmonirhat Sadar", "Patgram"] },
            { name: "Nilphamari", upazilas: ["Dimla", "Domar", "Jaldhaka", "Kishoreganj", "Nilphamari Sadar", "Saidpur"] },
            { name: "Panchagarh", upazilas: ["Atwari", "Boda", "Debiganj", "Panchagarh Sadar", "Tetulia"] },
            { name: "Rangpur", upazilas: ["Badarganj", "Gangachhara", "Kaunia", "Mithapukur", "Pirgachha", "Pirganj", "Rangpur Sadar", "Taraganj"] },
            { name: "Thakurgaon", upazilas: ["Baliadangi", "Haripur", "Pirganj", "Ranisankail", "Thakurgaon Sadar"] }
        ]
    },
    {
        division: "Sylhet",
        districts: [
            { name: "Habiganj", upazilas: ["Ajmiriganj", "Bahubal", "Baniachong", "Chunarughat", "Habiganj Sadar", "Lakhai", "Madhabpur", "Nabiganj", "Shayestaganj"] },
            { name: "Moulvibazar", upazilas: ["Barlekha", "Juri", "Kamalganj", "Kulaura", "Moulvibazar Sadar", "Rajnagar", "Sreemangal"] },
            { name: "Sunamganj", upazilas: ["Bishwamvarpur", "Chhatak", "Dakshin Sunamganj (Shantiganj)", "Derai", "Dharmapasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Madhyanagar", "Sunamganj Sadar", "Tahirpur"] },
            { name: "Sylhet", upazilas: ["Balaganj", "Beanibazar", "Bishwanath", "Companiganj", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Osmani Nagar", "Sylhet Sadar", "Zakiganj"] }
        ]
    }
];

async function setup() {
    const conn = await mysql.createConnection(dbConfig);
    console.log('Connected to DB...');

    try {
        // 1. Create Tables
        await conn.query(`CREATE TABLE IF NOT EXISTS divisions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL
        )`);

        await conn.query(`CREATE TABLE IF NOT EXISTS districts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            division_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE CASCADE
        )`);

        await conn.query(`CREATE TABLE IF NOT EXISTS upazilas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            district_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE
        )`);

        // Land Mutation Table (Updated Schema)
        /* 
        Fields required: 
        Division, District, Upazila,
        Name, Father Name, Mother Name, NID,
        Khotian, Dag, Land Amount (Jomir Poriman), Price, Dolil,
        Ownership Type (Own/Other),
        Buyer Info (Name, NID) -- "the persons information who wants to buy the land"
        Tracking ID
        */
        await conn.query(`CREATE TABLE IF NOT EXISTS land_mutations_v2 (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL, -- The logged in user (Likely the seller or applicant)
            
            -- Location
            division_id INT,
            district_id INT,
            upazila_id INT,

            -- Applicant / Seller Info (Who is filling or selling)
            applicant_name VARCHAR(255),
            applicant_father VARCHAR(255),
            applicant_mother VARCHAR(255),
            applicant_nid VARCHAR(50), 
            
            -- Land Info
            khatian_no VARCHAR(100),
            dag_no VARCHAR(100),
            land_amount VARCHAR(100),
            land_price DECIMAL(15, 2),
            deed_no VARCHAR(100),
            ownership_type ENUM('Own', 'Other'),
            
            -- Buyer Info
            buyer_name VARCHAR(255),
            buyer_nid VARCHAR(50),

            -- System
            tracking_number VARCHAR(50) UNIQUE,
            status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id) REFERENCES reg_info(id)
        )`);

        console.log('Tables created/verified.');

        // 2. Seed Data
        // Clear existing to avoid duplicates if re-running (Optional, but safe for dev)
        // await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        // await conn.query('TRUNCATE TABLE upazilas');
        // await conn.query('TRUNCATE TABLE districts');
        // await conn.query('TRUNCATE TABLE divisions');
        // await conn.query('SET FOREIGN_KEY_CHECKS = 1');

        // Actually, let's use INSERT IGNORE to be safe without truncating
        for (const div of locations) {
            // Insert Division
            await conn.query('INSERT IGNORE INTO divisions (name) VALUES (?)', [div.division]);
            const [divRes] = await conn.query('SELECT id FROM divisions WHERE name = ?', [div.division]);
            const divId = divRes[0].id;

            for (const dist of div.districts) {
                // Insert District
                await conn.query('INSERT IGNORE INTO districts (division_id, name) VALUES (?, ?)', [divId, dist.name]);
                const [distRes] = await conn.query('SELECT id FROM districts WHERE name = ? AND division_id = ?', [dist.name, divId]);
                const distId = distRes[0].id;

                // Insert Upazilas
                for (const upz of dist.upazilas) {
                    await conn.query('INSERT IGNORE INTO upazilas (district_id, name) VALUES (?, ?)', [distId, upz]);
                }
            }
        }

        console.log('Location data seeded successfully.');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await conn.end();
    }
}

setup();
