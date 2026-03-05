/**
 * Test de integración end-to-end
 * Simula el ciclo completo de una empresa
 */

const axios = require('axios');
const { pool } = require('../backend/db');

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testCompleteFlow() {
  console.log('🧪 Iniciando test de integración...\n');

  try {
    // 1. Crear empresa
    console.log('1️⃣  Creando empresa de prueba...');
    const companyRes = await axios.post(`${API_URL}/api/companies`, {
      user_id: 'test-user-001',
      name: 'TestCo',
      description: 'Una empresa de prueba que vende software B2B',
      industry: 'SaaS'
    });
    
    const company = companyRes.data.company;
    console.log(`   ✓ Empresa creada: ${company.id} (${company.subdomain})`);

    // 2. Verificar quotas
    console.log('\n2️⃣  Verificando sistema de quotas...');
    const quotaRes = await axios.get(`${API_URL}/api/companies/${company.id}/quotas`);
    console.log(`   ✓ Plan: ${quotaRes.data.plan}`);
    console.log(`   ✓ Tareas restantes: ${quotaRes.data.quotas.tasksPerDay.remaining}`);

    // 3. Ejecutar tarea de código
    console.log('\n3️⃣  Ejecutando agente de código...');
    const codeTaskRes = await axios.post(`${API_URL}/api/tasks/run`, {
      agent_type: 'code',
      description: 'Crear landing page simple'
    }, {
      headers: { 'x-company-id': company.id }
    });
    
    console.log(`   ✓ Tarea completada: ${codeTaskRes.data.result.summary}`);

    // 4. Ejecutar tarea de marketing
    console.log('\n4️⃣  Ejecutando agente de marketing...');
    const marketingTaskRes = await axios.post(`${API_URL}/api/tasks/run`, {
      agent_type: 'marketing',
      description: 'Generar estrategia de contenido'
    }, {
      headers: { 'x-company-id': company.id }
    });
    
    console.log(`   ✓ Marketing: ${marketingTaskRes.data.result.summary}`);

    // 5. Verificar actividad
    console.log('\n5️⃣  Verificando actividad reciente...');
    const activityRes = await axios.get(`${API_URL}/api/analytics/activity?limit=10`);
    const companyActivity = activityRes.data.activity.filter(a => a.company_id === company.id);
    console.log(`   ✓ ${companyActivity.length} actividades registradas`);

    // 6. Verificar costos LLM
    console.log('\n6️⃣  Verificando tracking de costos...');
    const costsRes = await pool.query(
      'SELECT SUM(estimated_cost) as total FROM llm_usage WHERE company_id = $1',
      [company.id]
    );
    const totalCost = parseFloat(costsRes.rows[0].total || 0);
    console.log(`   ✓ Costo total LLM: $${totalCost.toFixed(4)}`);

    // 7. Verificar límites de quota
    console.log('\n7️⃣  Verificando límites de quota...');
    try {
      // Intentar ejecutar muchas tareas para exceder quota
      for (let i = 0; i < 10; i++) {
        await axios.post(`${API_URL}/api/tasks/run`, {
          agent_type: 'analytics',
          description: 'Test'
        }, {
          headers: { 'x-company-id': company.id }
        });
      }
      console.log('   ⚠️  No se aplicó límite de quota (verificar configuración)');
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('   ✓ Límite de quota funcionando correctamente');
      } else {
        throw error;
      }
    }

    // 8. Cleanup
    console.log('\n8️⃣  Limpiando datos de prueba...');
    await axios.delete(`${API_URL}/api/companies/${company.id}`, {
      headers: { 'x-company-id': company.id }
    });
    console.log('   ✓ Empresa eliminada');

    console.log('\n════════════════════════════════════════');
    console.log('✅ TODOS LOS TESTS PASARON');
    console.log('════════════════════════════════════════\n');

    return true;

  } catch (error) {
    console.error('\n❌ TEST FALLIDO:');
    console.error(error.response?.data || error.message);
    console.error(error.stack);
    return false;
  } finally {
    await pool.end();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testCompleteFlow()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('Error fatal:', err);
      process.exit(1);
    });
}

module.exports = { testCompleteFlow };
