/**
 * Agent Orchestrator - Coordina todos los agentes executors
 */

const CodeExecutor = require('./executors/code-executor');
const ResearchExecutor = require('./executors/research-executor');
const BrowserExecutor = require('./executors/browser-executor');

class AgentOrchestrator {
  constructor() {
    this.agents = [];
    this.isRunning = false;
  }

  /**
   * Inicializar todos los agentes
   */
  initialize() {
    console.log('🎭 Inicializando Agent Orchestrator...\n');

    // Crear instancias de agentes
    this.agents = [
      new CodeExecutor(),
      new ResearchExecutor(),
      new BrowserExecutor()
      // TODO: Añadir más agentes:
      // new TwitterExecutor(),
      // new EmailExecutor(),
      // new DataExecutor(),
      // new FinancialExecutor()
    ];

    console.log(`✅ ${this.agents.length} agentes registrados\n`);
  }

  /**
   * Iniciar todos los agentes
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Orchestrator ya está corriendo');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Iniciando todos los agentes...\n');

    for (const agent of this.agents) {
      agent.start();
    }

    console.log('\n✅ Todos los agentes iniciados y polling backlog\n');
  }

  /**
   * Detener todos los agentes
   */
  stop() {
    console.log('\n🛑 Deteniendo todos los agentes...\n');

    for (const agent of this.agents) {
      agent.stop();
    }

    this.isRunning = false;
    console.log('✅ Todos los agentes detenidos\n');
  }

  /**
   * Status de agentes
   */
  status() {
    console.log('\n📊 Estado de agentes:\n');

    for (const agent of this.agents) {
      const status = agent.isRunning ? '🟢 Running' : '🔴 Stopped';
      console.log(`  ${status} - ${agent.agentName}`);
    }

    console.log('');
  }
}

// Singleton
let instance = null;

function getOrchestrator() {
  if (!instance) {
    instance = new AgentOrchestrator();
    instance.initialize();
  }
  return instance;
}

module.exports = {
  AgentOrchestrator,
  getOrchestrator
};
