/**
 * Vercel Deploy Service
 * 
 * Deploya landing pages de usuarios a Vercel via API.
 * Cada empresa tiene su propio proyecto Vercel con subdominio.
 * 
 * Flujo:
 * 1. Generar HTML/CSS/JS de la landing
 * 2. Crear proyecto en Vercel (si no existe)
 * 3. Subir archivos via API
 * 4. Asignar subdominio: negocio.lanzalo.pro
 * 5. Guardar URL en companies.website_url
 * 
 * Alternativa (sin Vercel token): sirve desde /sites/:subdomain en Railway
 */

const crypto = require('crypto');
const { pool } = require('../db');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || null;
const BASE_DOMAIN = 'lanzalo.pro';

class VercelDeployService {

  /**
   * Deploy landing page files a Vercel
   * @param {string} companyId 
   * @param {Object} files - { 'index.html': '...', 'styles.css': '...' }
   * @param {Object} options - { subdomain, companyName }
   * @returns {{ url: string, deploymentId: string, vercelUrl: string }}
   */
  async deploy(companyId, files, options = {}) {
    const { subdomain, companyName } = options;

    // Si no hay token de Vercel, usar deploy local (Railway /sites/:subdomain)
    if (!VERCEL_TOKEN) {
      console.log('[Vercel Deploy] No VERCEL_TOKEN — usando deploy local');
      return this.deployLocal(companyId, files, subdomain);
    }

    try {
      // 1. Buscar o crear proyecto en Vercel
      const projectName = `lanzalo-${subdomain}`;
      let project = await this.findOrCreateProject(projectName);

      // 2. Preparar archivos para upload
      const fileUploads = this.prepareFiles(files);

      // 3. Crear deployment
      const deployment = await this.createDeployment(project.id, fileUploads);

      // 4. Asignar subdominio custom (subdomain.lanzalo.pro)
      const customDomain = `${subdomain}.${BASE_DOMAIN}`;
      await this.addDomain(project.id, customDomain);

      // 5. Guardar en DB
      const deployUrl = `https://${customDomain}`;
      const vercelUrl = `https://${deployment.url}`;

      await this.saveDeployment(companyId, deployUrl, vercelUrl, files, deployment.id);

      console.log(`[Vercel Deploy] ✅ ${companyName} → ${deployUrl}`);

      return {
        url: deployUrl,
        vercelUrl,
        deploymentId: deployment.id,
        projectId: project.id
      };
    } catch (error) {
      console.error('[Vercel Deploy] Error:', error.message);
      // Fallback: deploy local
      console.log('[Vercel Deploy] Fallback a deploy local');
      return this.deployLocal(companyId, files, subdomain);
    }
  }

  /**
   * Buscar proyecto existente o crear uno nuevo
   */
  async findOrCreateProject(projectName) {
    const teamParam = VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : '';

    // Buscar proyecto existente
    try {
      const res = await fetch(
        `https://api.vercel.com/v9/projects/${projectName}?${teamParam}`,
        { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
      );
      if (res.ok) {
        return await res.json();
      }
    } catch (e) { /* no existe, crear */ }

    // Crear proyecto nuevo
    const res = await fetch(
      `https://api.vercel.com/v10/projects${teamParam ? '?' + teamParam.substring(1) : ''}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          framework: null // Static site
        })
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Error creando proyecto Vercel: ${JSON.stringify(err)}`);
    }

    return await res.json();
  }

  /**
   * Preparar archivos para la API de Vercel
   * Vercel requiere SHA1 hash + contenido
   */
  prepareFiles(files) {
    return Object.entries(files).map(([path, content]) => {
      const data = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
      const sha = crypto.createHash('sha1').update(data).digest('hex');
      return {
        file: path.startsWith('/') ? path : `/${path}`,
        sha,
        size: data.length,
        data
      };
    });
  }

  /**
   * Crear deployment en Vercel con files
   */
  async createDeployment(projectId, fileUploads) {
    const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';

    // Primero, subir cada archivo
    for (const file of fileUploads) {
      const uploadRes = await fetch(
        `https://api.vercel.com/v2/files${teamParam}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/octet-stream',
            'x-vercel-digest': file.sha,
            'Content-Length': file.size.toString()
          },
          body: file.data
        }
      );
      // 200 = uploaded, 409 = already exists (both OK)
      if (!uploadRes.ok && uploadRes.status !== 409) {
        console.warn(`[Vercel Deploy] File upload warning for ${file.file}: ${uploadRes.status}`);
      }
    }

    // Luego, crear el deployment
    const deployBody = {
      name: projectId,
      files: fileUploads.map(f => ({
        file: f.file,
        sha: f.sha,
        size: f.size
      })),
      projectSettings: {
        framework: null
      },
      target: 'production'
    };

    const res = await fetch(
      `https://api.vercel.com/v13/deployments${teamParam}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deployBody)
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Error creando deployment: ${JSON.stringify(err)}`);
    }

    return await res.json();
  }

  /**
   * Añadir dominio custom al proyecto
   */
  async addDomain(projectId, domain) {
    const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';

    const res = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/domains${teamParam}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: domain })
      }
    );

    // 409 = domain already exists (OK)
    if (!res.ok && res.status !== 409) {
      const err = await res.json();
      console.warn(`[Vercel Deploy] Domain warning for ${domain}:`, err);
    }
  }

  /**
   * Deploy local — fallback cuando no hay Vercel token
   * Guarda HTML en build_previews y sirve desde /sites/:subdomain
   */
  async deployLocal(companyId, files, subdomain) {
    const htmlContent = files['index.html'] || this.buildCompositeHTML(files);

    // Guardar en build_previews
    await pool.query(
      `INSERT INTO build_previews (id, company_id, html_content, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (company_id) DO UPDATE SET html_content = $3, created_at = NOW()`,
      [crypto.randomUUID(), companyId, htmlContent]
    );

    // Guardar todos los archivos como JSON en deployments
    const deployId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO deployments (id, company_id, url, type, framework, status, deploy_log, created_at)
       VALUES ($1, $2, $3, 'landing_page', 'static', 'live', $4, NOW())`,
      [
        deployId,
        companyId,
        `${subdomain}.${BASE_DOMAIN}`,
        JSON.stringify({ files: Object.keys(files), source: 'local' })
      ]
    );

    // URL local (servida por Railway)
    const url = `https://lanzalo-production.up.railway.app/sites/${subdomain}`;

    // Actualizar company
    await this.updateCompanyUrl(companyId, url);

    console.log(`[Vercel Deploy] ✅ Deploy local: /sites/${subdomain}`);

    return {
      url,
      vercelUrl: null,
      deploymentId: deployId,
      local: true
    };
  }

  /**
   * Componer HTML único si hay múltiples archivos
   */
  buildCompositeHTML(files) {
    const html = files['index.html'];
    if (html) return html;

    const css = files['styles.css'] || files['style.css'] || '';
    const js = files['app.js'] || files['script.js'] || '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  ${css ? `<style>${css}</style>` : ''}
</head>
<body class="bg-gray-950 text-white">
  <p class="text-center text-gray-500 p-12">Sitio en construcción</p>
  ${js ? `<script>${js}</script>` : ''}
</body>
</html>`;
  }

  /**
   * Guardar deployment en DB y actualizar company
   */
  async saveDeployment(companyId, url, vercelUrl, files, vercelDeployId) {
    const deployId = crypto.randomUUID();

    // Guardar HTML en build_previews (para preview interno)
    const htmlContent = files['index.html'] || this.buildCompositeHTML(files);
    await pool.query(
      `INSERT INTO build_previews (id, company_id, html_content, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (company_id) DO UPDATE SET html_content = $3, created_at = NOW()`,
      [crypto.randomUUID(), companyId, htmlContent]
    );

    // Guardar deployment
    await pool.query(
      `INSERT INTO deployments (id, company_id, url, type, framework, status, deploy_log, created_at)
       VALUES ($1, $2, $3, 'landing_page', 'static', 'live', $4, NOW())`,
      [
        deployId,
        companyId,
        url,
        JSON.stringify({
          files: Object.keys(files),
          vercelDeployId,
          vercelUrl,
          source: 'vercel'
        })
      ]
    );

    // Actualizar company website_url
    await this.updateCompanyUrl(companyId, url);

    return deployId;
  }

  /**
   * Actualizar website_url y status de la empresa
   */
  async updateCompanyUrl(companyId, url) {
    await pool.query(
      `UPDATE companies 
       SET website_url = $1, status = 'live', updated_at = NOW() 
       WHERE id = $2`,
      [url, companyId]
    );
  }

  /**
   * Obtener estado del deploy actual de una empresa
   */
  async getDeployStatus(companyId) {
    const result = await pool.query(
      `SELECT d.*, c.subdomain, c.website_url
       FROM deployments d
       JOIN companies c ON c.id = d.company_id
       WHERE d.company_id = $1
       ORDER BY d.created_at DESC
       LIMIT 1`,
      [companyId]
    );

    if (result.rows.length === 0) {
      return { deployed: false };
    }

    const deploy = result.rows[0];
    return {
      deployed: true,
      url: deploy.website_url || deploy.url,
      status: deploy.status,
      deployedAt: deploy.created_at,
      source: JSON.parse(deploy.deploy_log || '{}').source || 'unknown'
    };
  }
}

module.exports = new VercelDeployService();
module.exports.VercelDeployService = VercelDeployService;
