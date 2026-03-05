/**
 * Sistema de deployment a subdominios
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const axios = require('axios');

const DEPLOY_ROOT = '/var/www/lanzalo-deploys';
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

class Deployer {
  constructor(companyId, subdomain) {
    this.companyId = companyId;
    this.subdomain = subdomain;
    this.deployPath = path.join(DEPLOY_ROOT, subdomain);
  }

  /**
   * Desplegar sitio estático (HTML/CSS/JS)
   */
  async deployStatic(files) {
    try {
      // Crear directorio
      await fs.mkdir(this.deployPath, { recursive: true });

      // Escribir archivos
      for (const file of files) {
        const filePath = path.join(this.deployPath, file.filename);
        const fileDir = path.dirname(filePath);
        
        await fs.mkdir(fileDir, { recursive: true });
        await fs.writeFile(filePath, file.code);
      }

      // URL del sitio
      const url = `https://${this.subdomain}.lanzalo.app`;

      console.log(`✅ Sitio desplegado: ${url}`);

      return {
        success: true,
        url,
        type: 'static',
        files: files.map(f => f.filename)
      };
    } catch (error) {
      console.error('Error desplegando sitio estático:', error);
      throw error;
    }
  }

  /**
   * Desplegar a Vercel (serverless)
   */
  async deployToVercel(files, framework = 'nextjs') {
    if (!VERCEL_TOKEN) {
      throw new Error('VERCEL_TOKEN no configurado');
    }

    try {
      // Crear proyecto temporal
      const projectDir = `/tmp/vercel_${this.companyId}_${Date.now()}`;
      await fs.mkdir(projectDir, { recursive: true });

      // Escribir archivos
      for (const file of files) {
        const filePath = path.join(projectDir, file.filename);
        const fileDir = path.dirname(filePath);
        
        await fs.mkdir(fileDir, { recursive: true });
        await fs.writeFile(filePath, file.code);
      }

      // Crear vercel.json
      const vercelConfig = {
        name: this.subdomain,
        alias: [`${this.subdomain}.lanzalo.app`],
        framework
      };
      
      await fs.writeFile(
        path.join(projectDir, 'vercel.json'),
        JSON.stringify(vercelConfig, null, 2)
      );

      // Deploy con Vercel CLI
      const { stdout } = await execPromise(
        `cd ${projectDir} && vercel --token=${VERCEL_TOKEN} --prod --yes`,
        { env: { ...process.env, VERCEL_ORG_ID: process.env.VERCEL_ORG_ID } }
      );

      // Extraer URL del output
      const urlMatch = stdout.match(/https:\/\/[^\s]+/);
      const url = urlMatch ? urlMatch[0] : `https://${this.subdomain}.vercel.app`;

      // Limpiar
      await fs.rm(projectDir, { recursive: true, force: true });

      console.log(`✅ Desplegado en Vercel: ${url}`);

      return {
        success: true,
        url,
        type: 'vercel',
        framework
      };
    } catch (error) {
      console.error('Error desplegando a Vercel:', error);
      throw error;
    }
  }

  /**
   * Desplegar Docker container
   */
  async deployDocker(dockerfile, files) {
    try {
      const projectDir = path.join(DEPLOY_ROOT, 'docker', this.subdomain);
      await fs.mkdir(projectDir, { recursive: true });

      // Escribir Dockerfile
      await fs.writeFile(
        path.join(projectDir, 'Dockerfile'),
        dockerfile
      );

      // Escribir archivos de la app
      for (const file of files) {
        const filePath = path.join(projectDir, file.filename);
        const fileDir = path.dirname(filePath);
        
        await fs.mkdir(fileDir, { recursive: true });
        await fs.writeFile(filePath, file.code);
      }

      // Build imagen
      await execPromise(
        `docker build -t lanzalo-${this.subdomain} ${projectDir}`
      );

      // Detener contenedor anterior si existe
      try {
        await execPromise(`docker stop lanzalo-${this.subdomain}-container`);
        await execPromise(`docker rm lanzalo-${this.subdomain}-container`);
      } catch (e) {
        // Ignorar si no existe
      }

      // Ejecutar nuevo contenedor
      const port = await this.getAvailablePort();
      await execPromise(
        `docker run -d --name lanzalo-${this.subdomain}-container -p ${port}:3000 --memory=512m --cpus=0.5 lanzalo-${this.subdomain}`
      );

      const url = `https://${this.subdomain}.lanzalo.app`;

      console.log(`✅ Docker container desplegado: ${url}`);

      return {
        success: true,
        url,
        type: 'docker',
        port
      };
    } catch (error) {
      console.error('Error desplegando Docker:', error);
      throw error;
    }
  }

  /**
   * Obtener puerto disponible
   */
  async getAvailablePort() {
    // Implementación simple - en producción usar algo más robusto
    return 3000 + Math.floor(Math.random() * 10000);
  }

  /**
   * Verificar salud del deployment
   */
  async healthCheck(url) {
    try {
      const response = await axios.get(url, { 
        timeout: 5000,
        validateStatus: () => true 
      });
      
      return {
        healthy: response.status === 200,
        status: response.status,
        responseTime: response.headers['x-response-time']
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Rollback a versión anterior
   */
  async rollback(previousVersion) {
    // Implementar según el tipo de deployment
    console.log(`🔄 Rollback a versión: ${previousVersion}`);
    // TODO: Implementar lógica de rollback
  }

  /**
   * Eliminar deployment
   */
  async destroy() {
    try {
      // Detener Docker container si existe
      try {
        await execPromise(`docker stop lanzalo-${this.subdomain}-container`);
        await execPromise(`docker rm lanzalo-${this.subdomain}-container`);
        await execPromise(`docker rmi lanzalo-${this.subdomain}`);
      } catch (e) {
        // Ignorar errores
      }

      // Eliminar archivos
      await fs.rm(this.deployPath, { recursive: true, force: true });

      console.log(`🗑️  Deployment eliminado: ${this.subdomain}`);

      return { success: true };
    } catch (error) {
      console.error('Error eliminando deployment:', error);
      throw error;
    }
  }
}

module.exports = Deployer;
