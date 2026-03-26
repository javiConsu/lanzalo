const recordedQueries = [];

const mockPool = {
  query: jest.fn((sql, params) => {
    recordedQueries.push({ sql, params, timestamp: Date.now() });
    return Promise.resolve({ rows: [], rowCount: 0 });
  }),
  connect: jest.fn(() => Promise.resolve({
    query: jest.fn(() => Promise.resolve({ rows: [], rowCount: 0 })),
    release: jest.fn()
  })),
  end: jest.fn(() => Promise.resolve())
};

const mockTenantDB = jest.fn().mockImplementation((companyId) => ({
  companyId,
  createTask: jest.fn((tag, title, description) => 
    Promise.resolve({ id: 'mock-task-id', company_id: companyId, tag, title, description })
  ),
  updateTask: jest.fn(() => Promise.resolve()),
  logActivity: jest.fn(() => Promise.resolve()),
  getRecentTasks: jest.fn(() => Promise.resolve([])),
  query: jest.fn((sql, params) => {
    recordedQueries.push({ sql, params: [companyId, ...params], timestamp: Date.now() });
    return Promise.resolve({ rows: [], rowCount: 0 });
  })
}));

function getRecordedQueries() {
  return recordedQueries;
}

function clearRecordedQueries() {
  recordedQueries.length = 0;
}

module.exports = {
  pool: mockPool,
  TenantDB: mockTenantDB,
  getActiveCompanies: jest.fn(() => Promise.resolve([
    { id: 'company-1', name: 'TestCo1', status: 'live' },
    { id: 'company-2', name: 'TestCo2', status: 'live' }
  ])),
  getCompanyById: jest.fn((id) => Promise.resolve({ id, name: `Company-${id}` })),
  createCompany: jest.fn(() => Promise.resolve({ id: 'new-company' })),
  createTask: jest.fn(() => Promise.resolve({ id: 'task-id' })),
  updateTask: jest.fn(() => Promise.resolve()),
  getRecentTasks: jest.fn(() => Promise.resolve([])),
  createDeployment: jest.fn(() => Promise.resolve({ id: 'deployment-id' })),
  createEmail: jest.fn(() => Promise.resolve({ id: 'email-id' })),
  createTweet: jest.fn(() => Promise.resolve({ id: 'tweet-id' })),
  updateTweet: jest.fn(() => Promise.resolve()),
  logActivity: jest.fn(() => Promise.resolve()),
  getRecentActivity: jest.fn(() => Promise.resolve([])),
  recordMetric: jest.fn(() => Promise.resolve()),
  getRecordedQueries,
  clearRecordedQueries
};
