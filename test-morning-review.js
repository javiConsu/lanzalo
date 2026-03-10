/**
 * Test T-MORNING - Revisión matutina (versión simulada para pruebas)
 */

async function testMorningReview() {
  console.log('🌅 T-MORNING - Revisión matutina iniciada (PRUEBA)');
  console.log('⏰ Hora actual: 20:03 UTC (prueba manual)');
  console.log('');

  // Simular empresas activas
  const companies = [
    { id: '1', name: 'Lanzalo Demo' }
  ];

  console.log(`📊 Procesando ${companies.length} empresas`);

  for (const company of companies) {
    console.log(`\n🏢 T-MORNING para: ${company.name}`);

    try {
      // 1. Revisar métricas de ayer
      console.log('📈 Revisando métricas de ayer...');
      const metrics = {
        visits: 45,
        leads: 12,
        onboarding: 8,
        businesses_created: 5,
        trial_active: 10,
        trial_expired: 2,
        payments: 0
      };
      console.log(`   ✅ Visitas: ${metrics.visits}`);
      console.log(`   ✅ Leads: ${metrics.leads}`);
      console.log(`   ✅ Onboarding: ${metrics.onboarding}`);
      console.log(`   ✅ Negocios creados: ${metrics.businesses_created}`);
      console.log(`   ✅ Trial activo: ${metrics.trial_active}`);
      console.log(`   ✅ Trial expirado: ${metrics.trial_expired}`);
      console.log(`   ✅ Pagos: ${metrics.payments}`);

      // 2. Revisar campañas de marketing
      console.log('\n📱 Revisando campañas de marketing...');
      const campaigns = [
        {
          platform: 'twitter',
          posts: 2,
          avg_engagement: 1.2,
          total_clicks: 15
        },
        {
          platform: 'meta_ads',
          ads: 3,
          avg_ctr: 0.8,
          avg_cpc: 2.5
        },
        {
          platform: 'cold_outreach',
          emails: 2,
          avg_open_rate: 22,
          avg_reply_rate: 8
        }
      ];
      console.log(`   ✅ Twitter: ${campaigns[0].posts} posts, ${campaigns[0].avg_engagement}% engagement, ${campaigns[0].total_clicks} clicks`);
      console.log(`   ✅ Meta Ads: ${campaigns[1].ads} ads, ${campaigns[1].avg_ctr}% CTR, $${campaigns[1].avg_cpc} CPC`);
      console.log(`   ✅ Cold Outreach: ${campaigns[2].emails} emails, ${campaigns[2].avg_open_rate}% open rate, ${campaigns[2].avg_reply_rate}% reply rate`);

      // 3. Identificar cuellos de botella
      console.log('\n🔍 Identificando cuellos de botella...');
      const bottlenecks = [];

      // Twitter engagement rate bajo
      if (campaigns[0].avg_engagement < 1) {
        bottlenecks.push({
          type: 'twitter_engagement',
          severity: 'medium',
          description: 'Twitter engagement rate < 1%',
          metric: campaigns[0].avg_engagement,
          target: '> 1%'
        });
      }

      // Meta Ads CTR bajo
      if (campaigns[1].avg_ctr < 0.5) {
        bottlenecks.push({
          type: 'meta_ads_ctr',
          severity: 'high',
          description: 'Meta Ads CTR < 0.5%',
          metric: campaigns[1].avg_ctr,
          target: '> 0.5%'
        });
      }

      // Cold Outreach open rate bajo
      if (campaigns[2].avg_open_rate < 20) {
        bottlenecks.push({
          type: 'cold_outreach_open_rate',
          severity: 'medium',
          description: 'Cold Outreach open rate < 20%',
          metric: campaigns[2].avg_open_rate,
          target: '> 20%'
        });
      }

      if (bottlenecks.length === 0) {
        console.log('   ✅ No se detectaron cuellos de botella');
      } else {
        console.log(`   ⚠️ ${bottlenecks.length} cuellos de botella detectados:`);
        for (const bottleneck of bottlenecks) {
          console.log(`      - ${bottleneck.type}: ${bottleneck.description} (${bottleneck.metric}% vs target ${bottleneck.target})`);
        }
      }

      // 4. Crear 2-3 tareas de mejora
      console.log('\n💡 Creando tareas de mejora...');
      const improvementTasks = [];
      
      for (const bottleneck of bottlenecks) {
        const task = {
          company_id: company.id,
          title: this.generateTaskTitle(bottleneck),
          description: bottleneck.description,
          priority: this.mapSeverityToPriority(bottleneck.severity),
          type: 'improvement',
          status: 'pending',
          tag: this.getAgentTag(bottleneck.type),
          created_at: new Date()
        };
        improvementTasks.push(task);
      }

      if (improvementTasks.length === 0) {
        console.log('   ✅ No se crearon tareas de mejora (no hay cuellos de botella)');
      } else {
        console.log(`   ✅ ${improvementTasks.length} tareas de mejora creadas:`);
        for (const task of improvementTasks) {
          console.log(`      - ${task.title} (Prioridad: ${task.priority}, Agente: ${task.tag})`);
        }
      }

      console.log(`\n✅ T-MORNING completado para ${company.name}`);

    } catch (error) {
      console.error(`❌ T-MORNING falló para ${company.name}:`, error);
    }
  }

  console.log('\n🌅 T-MORNING completado (PRUEBA)');
}

// Funciones auxiliares
testMorningReview.generateTaskTitle = function(bottleneck) {
  const titles = {
    'twitter_engagement': 'Optimizar copy de tweets para aumentar engagement rate',
    'meta_ads_ctr': 'Optimizar creativos de Meta Ads para aumentar CTR',
    'cold_outreach_open_rate': 'Optimizar asuntos y preview de cold emails'
  };
  return titles[bottleneck.type] || 'Optimizar canal de marketing';
};

testMorningReview.mapSeverityToPriority = function(severity) {
  const mapping = {
    'critical': 'critical',
    'high': 'high',
    'medium': 'medium',
    'low': 'low'
  };
  return mapping[severity] || 'medium';
};

testMorningReview.getAgentTag = function(bottleneckType) {
  const tags = {
    'twitter_engagement': 'content',
    'meta_ads_ctr': 'content',
    'cold_outreach_open_rate': 'content'
  };
  return tags[bottleneckType] || 'engineering';
};

testMorningReview().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});