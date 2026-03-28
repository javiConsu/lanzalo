const paths = [
  './backend/services/budget-manager',
  './backend/services/heartbeat',
  './backend/services/governance-helper',
  './backend/routes/budgets',
  './backend/routes/heartbeat',
  './backend/routes/company-dashboard',
  './agents/ceo-agent',
  './agents/code-agent',
  './agents/marketing-agent',
  './agents/email-agent',
  './agents/analytics-agent',
  './agents/twitter-agent'
];

for (const modulePath of paths) {
  try {
    require(modulePath);
    console.log(`OK ${modulePath}`);
  } catch (error) {
    console.error(`FAIL ${modulePath}`);
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log('VALIDATION_OK');
}
