/**
 * Sandbox seguro para ejecutar código generado por LLM
 */

const { VM } = require('vm2');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const WORKSPACE_ROOT = '/tmp/lanzalo_workspaces';
const EXECUTION_TIMEOUT = 30000; // 30 segundos
const MEMORY_LIMIT_MB = 512;

// Patrones peligrosos que nunca deben ejecutarse
const DANGEROUS_PATTERNS = [
  /require\s*\(\s*['"]child_process['"]\s*\)/,
  /require\s*\(\s*['"]fs['"]\s*\)/,
  /require\s*\(\s*['"]net['"]\s*\)/,
  /eval\s*\(/,
  /new\s+Function\s*\(/,
  /process\.env/,
  /process\.exit/,
  /__dirname/,
  /__filename/,
  /import\s+.*\s+from/,  // ES modules podrían importar cosas peligrosas
];

class CodeExecutor {
  constructor(companyId) {
    this.companyId = companyId;
    this.workspaceDir = path.join(WORKSPACE_ROOT, companyId);
  }

  /**
   * Inicializar workspace para la empresa
   */
  async initWorkspace() {
    try {
      await fs.mkdir(this.workspaceDir, { recursive: true });
      console.log(`✅ Workspace creado: ${this.workspaceDir}`);
    } catch (error) {
      console.error('Error creando workspace:', error);
      throw error;
    }
  }

  /**
   * Validar código antes de ejecutar
   */
  validateCode(code) {
    const violations = [];

    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(code)) {
        violations.push(`Patrón peligroso detectado: ${pattern}`);
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Código rechazado por seguridad:\n${violations.join('\n')}`
      );
    }

    return true;
  }

  /**
   * Ejecutar código JavaScript en sandbox
   */
  async executeJS(code, context = {}) {
    // Validar primero
    this.validateCode(code);

    // Crear sandbox limitado
    const vm = new VM({
      timeout: EXECUTION_TIMEOUT,
      sandbox: {
        console: {
          log: (...args) => console.log(`[${this.companyId}]`, ...args),
          error: (...args) => console.error(`[${this.companyId}]`, ...args)
        },
        // Funciones permitidas
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        // Contexto personalizado
        ...context
      },
      eval: false,
      wasm: false
    });

    try {
      const result = vm.run(code);
      return {
        success: true,
        result,
        output: 'Ejecución exitosa'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Ejecutar código en contenedor Docker (máximo aislamiento)
   */
  async executeInDocker(code, language = 'node') {
    await this.initWorkspace();

    const filename = `code_${Date.now()}.${language === 'node' ? 'js' : 'py'}`;
    const filepath = path.join(this.workspaceDir, filename);

    // Escribir código a archivo
    await fs.writeFile(filepath, code);

    // Comando Docker según lenguaje
    const dockerCommands = {
      node: `docker run --rm -v ${this.workspaceDir}:/workspace -w /workspace --memory=${MEMORY_LIMIT_MB}m --cpus=0.5 node:18-alpine timeout 30 node ${filename}`,
      python: `docker run --rm -v ${this.workspaceDir}:/workspace -w /workspace --memory=${MEMORY_LIMIT_MB}m --cpus=0.5 python:3.11-alpine timeout 30 python ${filename}`
    };

    const command = dockerCommands[language];

    try {
      const { stdout, stderr } = await execPromise(command);
      
      return {
        success: true,
        stdout,
        stderr,
        output: stdout
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr
      };
    } finally {
      // Limpiar archivo
      await fs.unlink(filepath).catch(() => {});
    }
  }

  /**
   * Ejecutar tests sobre el código
   */
  async runTests(code, tests) {
    const results = [];

    for (const test of tests) {
      try {
        const result = await this.executeJS(`
          ${code}
          
          // Ejecutar test
          const testResult = ${test.code};
          testResult;
        `);

        results.push({
          name: test.name,
          passed: result.success && result.result === test.expected,
          actual: result.result,
          expected: test.expected
        });
      } catch (error) {
        results.push({
          name: test.name,
          passed: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Limpiar workspace de la empresa
   */
  async cleanup() {
    try {
      await fs.rm(this.workspaceDir, { recursive: true, force: true });
      console.log(`🧹 Workspace limpiado: ${this.workspaceDir}`);
    } catch (error) {
      console.error('Error limpiando workspace:', error);
    }
  }
}

module.exports = CodeExecutor;
