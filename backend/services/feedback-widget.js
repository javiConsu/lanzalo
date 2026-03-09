/**
 * Feedback Widget Injection
 * 
 * Inyecta un botón flotante de feedback en las landing pages de los usuarios.
 * Al hacer click, redirige al dashboard de Lanzalo con un mensaje pre-llenado
 * para el Co-Founder chat: "Quiero ajustar cosas de la web"
 * 
 * Se inyecta justo antes de </body> en el HTML.
 */

const DASHBOARD_URL = 'https://lanzalo.pro';

/**
 * Genera el HTML del widget de feedback
 * @param {string} companyId - UUID de la empresa
 * @param {string} subdomain - Subdominio de la empresa
 * @returns {string} HTML snippet para inyectar
 */
function getFeedbackWidgetHTML(companyId, subdomain) {
  const chatUrl = `${DASHBOARD_URL}/?feedback=web&company=${companyId}`;

  return `
<!-- Lanzalo Feedback Widget -->
<div id="lanzalo-feedback" style="position:fixed;bottom:24px;left:24px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <button onclick="document.getElementById('lanzalo-fb-panel').style.display=document.getElementById('lanzalo-fb-panel').style.display==='none'?'flex':'none'" 
    style="display:flex;align-items:center;gap:8px;background:#18181b;color:#a1a1aa;border:1px solid #27272a;padding:8px 14px;border-radius:12px;cursor:pointer;font-size:13px;font-weight:500;box-shadow:0 4px 24px rgba(0,0,0,.4);transition:all .2s;"
    onmouseover="this.style.borderColor='#10b981';this.style.color='#e4e4e7'"
    onmouseout="this.style.borderColor='#27272a';this.style.color='#a1a1aa'">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    Feedback
  </button>
  <div id="lanzalo-fb-panel" style="display:none;flex-direction:column;gap:10px;position:absolute;bottom:48px;left:0;background:#18181b;border:1px solid #27272a;border-radius:16px;padding:16px;min-width:260px;box-shadow:0 8px 32px rgba(0,0,0,.5);">
    <div style="font-size:14px;font-weight:600;color:#e4e4e7;">¿Algo que mejorar?</div>
    <div style="font-size:12px;color:#71717a;line-height:1.4;">El copy, el diseño, los textos... Dile a tu Co-Founder qué quieres cambiar.</div>
    <a href="${chatUrl}" target="_blank" rel="noopener"
      style="display:flex;align-items:center;justify-content:center;gap:6px;background:#10b981;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:600;transition:background .2s;"
      onmouseover="this.style.background='#059669'"
      onmouseout="this.style.background='#10b981'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      Hablar con mi Co-Founder
    </a>
    <div style="font-size:10px;color:#52525b;text-align:center;">Powered by <a href="https://lanzalo.pro" style="color:#10b981;text-decoration:none;" target="_blank">Lanzalo</a></div>
  </div>
</div>
<script>
  // Close panel when clicking outside
  document.addEventListener('click', function(e) {
    var fb = document.getElementById('lanzalo-feedback');
    var panel = document.getElementById('lanzalo-fb-panel');
    if (fb && panel && !fb.contains(e.target)) {
      panel.style.display = 'none';
    }
  });
</script>
<!-- /Lanzalo Feedback Widget -->
`;
}

/**
 * Inyecta el widget de feedback en el HTML de una landing page
 * @param {string} html - HTML completo de la página
 * @param {string} companyId - UUID de la empresa
 * @param {string} subdomain - Subdominio
 * @returns {string} HTML con el widget inyectado
 */
function injectFeedbackWidget(html, companyId, subdomain) {
  if (!html || !companyId) return html;

  // Don't inject if already present
  if (html.includes('lanzalo-feedback')) return html;

  const widget = getFeedbackWidgetHTML(companyId, subdomain);

  // Inject before </body>
  if (html.includes('</body>')) {
    return html.replace('</body>', widget + '\n</body>');
  }

  // Fallback: append at the end
  return html + widget;
}

module.exports = {
  getFeedbackWidgetHTML,
  injectFeedbackWidget
};
