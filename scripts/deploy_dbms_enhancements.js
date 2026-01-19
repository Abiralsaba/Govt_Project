/**
 * Deploy DBMS Enhancements
 * 
 * This script deploys all database enhancements:
 * - Normalized schema tables
 * - Views
 * - Stored procedures
 * - Triggers
 * 
 * Run: node scripts/deploy_dbms_enhancements.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'central_govt',
    multipleStatements: true
};

const SQL_FILES = [
    { name: 'Normalized Schema', path: '../src/database/schema_normalized.sql' },
    { name: 'Views', path: '../src/database/views.sql' },
    { name: 'Stored Procedures', path: '../src/database/procedures.sql' },
    { name: 'Triggers', path: '../src/database/triggers.sql' }
];

async function executeSqlFile(conn, filePath, name) {
    console.log(`\n📄 Deploying: ${name}`);
    console.log(`   File: ${filePath}`);

    try {
        const fullPath = path.join(__dirname, filePath);

        if (!fs.existsSync(fullPath)) {
            console.log(`   ⚠️  File not found, skipping...`);
            return false;
        }

        let sql = fs.readFileSync(fullPath, 'utf8');

        // Remove comments for cleaner execution
        sql = sql.replace(/--.*$/gm, '');

        // Split by delimiter for procedures/triggers
        if (sql.includes('DELIMITER //')) {
            // Handle DELIMITER statements
            const parts = sql.split('DELIMITER //');

            for (let i = 0; i < parts.length; i++) {
                let part = parts[i].trim();

                if (i === 0) {
                    // First part before DELIMITER
                    if (part) {
                        const statements = part.split(';').filter(s => s.trim());
                        for (const stmt of statements) {
                            if (stmt.trim()) {
                                await conn.query(stmt);
                            }
                        }
                    }
                } else {
                    // Parts with // delimiter
                    const subParts = part.split('DELIMITER ;');
                    const procPart = subParts[0];

                    // Split by //
                    const procs = procPart.split('//').filter(s => s.trim());
                    for (const proc of procs) {
                        if (proc.trim() && !proc.trim().startsWith('DELIMITER')) {
                            try {
                                await conn.query(proc);
                            } catch (procErr) {
                                console.log(`   ⚠️  Warning: ${procErr.message.substring(0, 80)}...`);
                            }
                        }
                    }

                    // Execute remaining statements after DELIMITER ;
                    if (subParts[1]) {
                        const remaining = subParts[1].split(';').filter(s => s.trim());
                        for (const stmt of remaining) {
                            if (stmt.trim()) {
                                await conn.query(stmt);
                            }
                        }
                    }
                }
            }
        } else {
            // Regular SQL statements
            const statements = sql.split(';').filter(s => s.trim());

            for (const stmt of statements) {
                if (stmt.trim()) {
                    try {
                        await conn.query(stmt);
                    } catch (stmtErr) {
                        // Ignore duplicate/exists errors for IF NOT EXISTS
                        if (!stmtErr.message.includes('already exists') &&
                            !stmtErr.message.includes('Duplicate')) {
                            console.log(`   ⚠️  Warning: ${stmtErr.message.substring(0, 80)}...`);
                        }
                    }
                }
            }
        }

        console.log(`   ✅ ${name} deployed successfully`);
        return true;
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return false;
    }
}

async function verifyDeployment(conn) {
    console.log('\n📊 Verifying Deployment...\n');

    // Check tables
    console.log('📋 New Tables:');
    const [tables] = await conn.query(`
        SELECT TABLE_NAME FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME IN ('address_types', 'addresses', 'document_statuses', 
                           'payment_methods', 'payments', 'audit_log')
    `, [dbConfig.database]);
    tables.forEach(t => console.log(`   ✓ ${t.TABLE_NAME}`));

    // Check views
    console.log('\n👁️  Views:');
    const [views] = await conn.query(`
        SELECT TABLE_NAME FROM information_schema.VIEWS 
        WHERE TABLE_SCHEMA = ?
    `, [dbConfig.database]);
    views.forEach(v => console.log(`   ✓ ${v.TABLE_NAME}`));

    // Check procedures
    console.log('\n⚙️  Stored Procedures:');
    const [procs] = await conn.query(`
        SELECT ROUTINE_NAME FROM information_schema.ROUTINES 
        WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'
    `, [dbConfig.database]);
    procs.forEach(p => console.log(`   ✓ ${p.ROUTINE_NAME}`));

    // Check triggers
    console.log('\n⚡ Triggers:');
    const [triggers] = await conn.query(`
        SELECT TRIGGER_NAME FROM information_schema.TRIGGERS 
        WHERE TRIGGER_SCHEMA = ?
    `, [dbConfig.database]);
    triggers.forEach(t => console.log(`   ✓ ${t.TRIGGER_NAME}`));

    return {
        tables: tables.length,
        views: views.length,
        procedures: procs.length,
        triggers: triggers.length
    };
}

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('   DBMS Enhancement Deployment Script');
    console.log('   Central Government System');
    console.log('═══════════════════════════════════════════════════');
    console.log(`\n🔌 Connecting to database: ${dbConfig.database}@${dbConfig.host}`);

    const conn = await mysql.createConnection(dbConfig);
    console.log('   ✅ Connected successfully\n');

    let successCount = 0;

    for (const file of SQL_FILES) {
        const success = await executeSqlFile(conn, file.path, file.name);
        if (success) successCount++;
    }

    // Verify deployment
    const stats = await verifyDeployment(conn);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('   DEPLOYMENT SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   Files Deployed: ${successCount}/${SQL_FILES.length}`);
    console.log(`   Tables Created: ${stats.tables}`);
    console.log(`   Views Created: ${stats.views}`);
    console.log(`   Procedures Created: ${stats.procedures}`);
    console.log(`   Triggers Created: ${stats.triggers}`);
    console.log('═══════════════════════════════════════════════════\n');

    await conn.end();
    console.log('✅ Deployment complete!\n');
}

main().catch(err => {
    console.error('❌ Deployment failed:', err.message);
    process.exit(1);
});
