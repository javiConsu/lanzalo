/**
 * Servir sitios web de clientes
 * 
 * Ruta: /sites/:subdomain
 * Sirve el HTML generado por el Code Agent desde la DB
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * GET /sites/:subdomain — Servir sitio del cliente
 */
router.get('/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;

    // Buscar empresa por subdomain
    const companyResult = await pool.query(
      'SELECT id, name FROM companies WHERE subdomain = $1',
      [subdomain]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head><title>No encontrado</title>
        <script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-gray-900 text-white min-h-screen flex items-center justify-center">
          <div class="text-center">
            <h1 class="text-4xl font-bold mb-4">404</h1>
            <p class="text-gray-400">Este negocio no existe todavía.</p>
            <a href="https://lanzalo.pro" class="mt-6 inline-block text-blue-400 hover:underline">
              ¿Quieres crear el tuyo? → lanzalo.pro
            </a>
          </div>
        </body></html>
      `);
    }

    const company = companyResult.rows[0];

    // Buscar último deploy
    const previewResult = await pool.query(
      'SELECT html_content FROM build_previews WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
      [company.id]
    );

    if (previewResult.rows.length === 0) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head><title>${company.name} — En construcción</title>
        <script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-gray-900 text-white min-h-screen flex items-center justify-center">
          <div class="text-center p-8">
            <div class="text-6xl mb-4">🚧</div>
            <h1 class="text-3xl font-bold mb-4">${company.name}</h1>
            <p class="text-gray-400 text-lg">Estamos construyendo algo increíble.</p>
            <p class="text-gray-500 text-sm mt-4">Vuelve pronto.</p>
          </div>
        </body></html>
      `);
    }

    // Servir HTML
    res.type('html').send(previewResult.rows[0].html_content);

  } catch (error) {
    console.error('[Sites] Error:', error);
    res.status(500).send('Error interno');
  }
});

module.exports = router;
