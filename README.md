# Central Government System App

This is a Node.js + MySQL application for the Central Government System of Bangladesh.

## Prerequisites
1. **Node.js**: Ensure Node.js is installed.
2. **XAMPP / MySQL**: Ensure your MySQL server (XAMPP) is running.
3. **Database**: The database `central_govt_db` will be created automatically.

## Installation
1. Open a terminal in the project folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the database (if first time):
   ```bash
   node scripts/setup_db.js
   node scripts/deploy_schema.js
   node scripts/deploy_expansion.js
   ```

## Running the App
To start the server, run:
```bash
npm start
```
Or directly:
```bash
node src/app.js
```

The application will be available at: **http://localhost:3000**

## Features
- **Secure Login/Registration**: Stores Full Name, NID, Mobile, Address, etc.
- **Forgot Password**: 2-Step Email OTP verification.
- **Massive Schema**: Over 100 tables covering NID, Passport, Tax, Health, etc.
