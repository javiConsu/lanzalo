/**
 * Preview Generator
 * Generates build previews from Discovery analysis
 * Inspired by lead-magnet-quiz-workflow builder-prompt pattern
 */

const { callLLM } = require('../backend/llm');
const industryTemplates = require('./templates/industry-templates');

/**
 * Generate build preview
 * @param {object} options - Discovery analysis + selected path
 * @returns {object} Preview data with HTML
 */
async function generateBuildPreview({ discoveryAnalysis, selectedPath, companyId }) {
  console.log('[Preview Generator] Generating preview...');

  // Detect industry from selected path
  const industry = detectIndustry(selectedPath);
  
  // Get template for industry
  const template = industryTemplates[industry] || industryTemplates.default;

  // Generate preview with LLM
  const prompt = buildPreviewPrompt(discoveryAnalysis, selectedPath, template);
  
  const response = await callLLM(prompt, {
    temperature: 0.3,
    maxTokens: 4000,
    model: 'anthropic/claude-sonnet-4'
  });

  // Parse response
  let previewData;
  try {
    previewData = JSON.parse(response);
  } catch (e) {
    // Try to extract JSON
    const match = response.match(/```json\n([\s\S]*?)\n```/);
    if (match) {
      previewData = JSON.parse(match[1]);
    } else {
      throw new Error('Failed to parse preview data');
    }
  }

  // Generate HTML preview
  const previewHTML = generatePreviewHTML(previewData, template);

  return {
    ...previewData,
    industry,
    template_id: template.id,
    preview_html: previewHTML
  };
}

/**
 * Build prompt for preview generation
 */
function buildPreviewPrompt(discovery, path, template) {
  return `You are a strategic product architect.

Generate a BUILD PREVIEW for a user based on their strategic analysis.

USER PROFILE:
${JSON.stringify(discovery.unfairAdvantages, null, 2)}

SELECTED PATH:
${JSON.stringify(path, null, 2)}

INDUSTRY TEMPLATE:
${JSON.stringify(template, null, 2)}

Generate a detailed build preview that shows EXACTLY what will be built.

Return JSON with this structure:

{
  "title": "What we'll build (1 sentence)",
  "description": "Why this approach (2-3 sentences)",
  "industry": "${template.industry}",
  
  "landing_page": {
    "sections": [
      {
        "type": "hero",
        "headline": "Main value prop",
        "subheadline": "Supporting text",
        "cta": "Primary action"
      },
      {
        "type": "features",
        "items": [
          {"title": "Feature 1", "description": "...", "icon": "emoji"}
        ]
      },
      {
        "type": "social_proof",
        "testimonials": [...],
        "logos": [...]
      },
      {
        "type": "pricing",
        "plans": [...]
      }
    ],
    "design": {
      "primaryColor": "#hex",
      "font": "Font name",
      "style": "minimal|modern|playful|professional"
    },
    "copy": {
      "tone": "professional|casual|technical|friendly",
      "valueProps": ["Prop 1", "Prop 2", "Prop 3"]
    }
  },
  
  "features": [
    {
      "name": "Feature name",
      "description": "What it does",
      "priority": "must-have|nice-to-have",
      "complexity": "simple|medium|complex",
      "estimated_hours": 4
    }
  ],
  
  "tech_stack": {
    "frontend": ["Astro", "Tailwind", "Alpine.js"],
    "backend": ["Vercel Edge Functions", "Supabase"],
    "integrations": ["Resend", "Stripe"]
  },
  
  "timeline": {
    "total_weeks": 2,
    "milestones": [
      {"week": 1, "deliverable": "Landing page live"},
      {"week": 2, "deliverable": "Full product deployed"}
    ]
  },
  
  "complexity": "simple|medium|complex",
  
  "marketing_strategy": {
    "channels": ["Twitter", "Reddit", "Product Hunt"],
    "launch_plan": "Brief description",
    "content_pillars": ["Pillar 1", "Pillar 2"]
  },
  
  "success_metrics": {
    "primary": "MRR",
    "targets": {
      "month_1": "€500",
      "month_3": "€2K",
      "month_6": "€5K"
    }
  }
}

Make it specific to their unfair advantages and selected path.
Use the industry template as a guide for structure.
Be realistic about timelines and complexity.

Return ONLY the JSON, nothing else.`;
}

/**
 * Generate HTML preview for iframe display
 */
function generatePreviewHTML(previewData, template) {
  const { landing_page } = previewData;
  
  if (!landing_page) {
    return '<p>No preview available</p>';
  }

  const { design, sections } = landing_page;

  let html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${previewData.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --primary-color: ${design.primaryColor || '#3b82f6'};
    }
    body {
      font-family: ${design.font || 'Inter'}, -apple-system, sans-serif;
    }
  </style>
</head>
<body class="bg-gray-50">
`;

  // Render sections
  sections.forEach(section => {
    html += renderSection(section, design);
  });

  html += `
  <footer class="bg-gray-900 text-white py-8 px-4 text-center">
    <p class="text-sm opacity-75">Preview generated by Lanzalo AI</p>
  </footer>
</body>
</html>`;

  return html;
}

/**
 * Render section HTML
 */
function renderSection(section, design) {
  switch (section.type) {
    case 'hero':
      return `
<section class="bg-gradient-to-br from-blue-600 to-purple-600 text-white py-20 px-4">
  <div class="max-w-4xl mx-auto text-center">
    <h1 class="text-5xl font-bold mb-4">${section.headline}</h1>
    <p class="text-xl opacity-90 mb-8">${section.subheadline}</p>
    <button class="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100">
      ${section.cta}
    </button>
  </div>
</section>`;

    case 'features':
      const features = section.items.map(f => `
<div class="bg-white p-6 rounded-lg shadow-sm">
  <div class="text-4xl mb-4">${f.icon || '✨'}</div>
  <h3 class="text-xl font-bold mb-2">${f.title}</h3>
  <p class="text-gray-600">${f.description}</p>
</div>`).join('\n');
      
      return `
<section class="py-16 px-4">
  <div class="max-w-6xl mx-auto">
    <div class="grid md:grid-cols-3 gap-8">
      ${features}
    </div>
  </div>
</section>`;

    case 'pricing':
      const plans = section.plans.map(p => `
<div class="bg-white p-8 rounded-lg shadow-md ${p.highlighted ? 'ring-2 ring-blue-500' : ''}">
  <h3 class="text-2xl font-bold mb-2">${p.name}</h3>
  <div class="text-4xl font-bold mb-4">${p.price}</div>
  <ul class="space-y-2 mb-6">
    ${p.features.map(f => `<li>✓ ${f}</li>`).join('\n')}
  </ul>
  <button class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold">
    ${p.cta || 'Get Started'}
  </button>
</div>`).join('\n');
      
      return `
<section class="py-16 px-4 bg-gray-100">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl font-bold text-center mb-12">Pricing</h2>
    <div class="grid md:grid-cols-3 gap-8">
      ${plans}
    </div>
  </div>
</section>`;

    default:
      return '';
  }
}

/**
 * Detect industry from selected path
 */
function detectIndustry(path) {
  const name = path.name.toLowerCase();
  
  if (name.includes('saas') || name.includes('software')) return 'saas';
  if (name.includes('ecommerce') || name.includes('store')) return 'ecommerce';
  if (name.includes('marketplace')) return 'marketplace';
  if (name.includes('agency') || name.includes('service')) return 'agency';
  if (name.includes('content') || name.includes('course')) return 'content';
  
  return 'default';
}

module.exports = {
  generateBuildPreview
};
