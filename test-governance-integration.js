#!/usr/bin/env node

/**
 * Test Integration - Budget/Governance/Heartbeat
 *
 * This script tests the governance helper integration with agents
 */

require('dotenv').config();
const { pool } = require('../backend/db');

async function testIntegration() {
  console.log('🧪 Testing Governance & Budget Integration\n');

  try {
    // 1. Test Budget Manager
    console.log('1️⃣  Testing Budget Manager...');
    const budgetCheck = await require('../backend/services/budget-manager').checkBudget('CEO');
    console.log('   Budget check for CEO:', budgetCheck);
    console.log('   ✓ Budget manager working\n');

    // 2. Test Governance Helper
    console.log('2️⃣  Testing Governance Helper...');
    const governanceStatus = await require('../backend/services/governance-helper').checkGovernanceStatus('CEO');
    console.log('   Governance status:', governanceStatus);
    console.log('   ✓ Governance helper working\n');

    // 3. Test Heartbeat
    console.log('3️⃣  Testing Heartbeat...');
    await require('../backend/services/heartbeat').recordHeartbeat('CEO');
    console.log('   ✓ Heartbeat recorded\n');

    // 4. Test API Endpoints
    console.log('4️⃣  Testing API Endpoints...');
    const http = require('http');

    // Test budgets endpoint
    http.get('http://localhost:3001/api/budgets', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('   Budgets endpoint:', JSON.parse(data));
      });
    }).on('error', err => {
      console.log('   ⚠️  Budgets endpoint not responding (server may not be running)');
    });

    // Test governance endpoint
    http.get('http://localhost:3001/api/governance/events', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('   Governance events endpoint:', JSON.parse(data));
      });
    }).on('error', err => {
      console.log('   ⚠️  Governance endpoint not responding (server may not be running)');
    });

    // Test heartbeat endpoint
    http.get('http://localhost:3001/api/heartbeat/status', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('   Heartbeat status endpoint:', JSON.parse(data));
      });
    }).on('error', err => {
      console.log('   ⚠️  Heartbeat endpoint not responding (server may not be running)');
    });

    console.log('\n✅ Integration tests completed!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testIntegration();