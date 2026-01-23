/**
 * Dump Database Schema to schema_full.sql
 * 
 * This script connects to the database and exports
 * all table structures (CREATE TABLE statements) 
 * and views to a single SQL file.
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function dumpSchema() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database:', process.env.DB_NAME);

        // Get all table names
        const [tables] = await connection.query(`
            SELECT TABLE_NAME, TABLE_TYPE 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? 
            ORDER BY TABLE_TYPE ASC, TABLE_NAME
        `, [process.env.DB_NAME]);

        let schemaSQL = `-- ==========================================
-- FULL DATABASE SCHEMA DUMP
-- Generated at: ${new Date().toISOString()}
-- ==========================================

SET FOREIGN_KEY_CHECKS = 0;

`;

        for (const table of tables) {
            const tableName = table.TABLE_NAME;
            const tableType = table.TABLE_TYPE;

            if (tableType === 'BASE TABLE') {
                const [createResult] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
                let createSQL = createResult[0]['Create Table'];

                // Humanize SQL
                // 1. Remove table options at the end (ENGINE, CHARSET, etc.)
                createSQL = createSQL.replace(/\) ENGINE=InnoDB.*$/, ');');

                // 2. Add IF NOT EXISTS
                createSQL = createSQL.replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS');

                // 3. Remove backticks (makes it look more human-written)
                createSQL = createSQL.replace(/`/g, '');

                // 4. Remove AUTO_INCREMENT from table options if it wasn't caught above or is different format
                createSQL = createSQL.replace(/ AUTO_INCREMENT=\d+/g, '');

                // 5. Remove character set info from columns if it's default
                createSQL = createSQL.replace(/ CHARACTER SET utf8mb4 COLLATE utf8mb4_bin/g, '');
                createSQL = createSQL.replace(/ COLLATE utf8mb4_general_ci/g, '');
                createSQL = createSQL.replace(/ DEFAULT CHARSET=utf8mb4/g, '');

                schemaSQL += `-- Table: ${tableName}\n`;
                schemaSQL += createSQL + '\n\n';
            } else if (tableType === 'VIEW') {
                const [createResult] = await connection.query(`SHOW CREATE VIEW \`${tableName}\``);
                let createSQL = createResult[0]['Create View'];

                // Clean up VIEW definition (remove DEFINER)
                createSQL = createSQL.replace(/CREATE ALGORITHM=.* DEFINER=`[^`]+`@`[^`]+` SQL SECURITY DEFINER VIEW/, 'CREATE VIEW');

                schemaSQL += `-- View: ${tableName}\n`;
                schemaSQL += createSQL + ';\n\n';
            }
        }

        schemaSQL += 'SET FOREIGN_KEY_CHECKS = 1;\n';

        // Write to file
        const outputPath = path.join(__dirname, '../src/database/schema_full.sql');
        fs.writeFileSync(outputPath, schemaSQL);

        console.log(`Schema exported successfully to: ${outputPath}`);
        console.log(`Total tables/views: ${tables.length}`);

    } catch (error) {
        console.error('Error dumping schema:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

dumpSchema();
