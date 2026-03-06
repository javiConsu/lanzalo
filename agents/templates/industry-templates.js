/**
 * Industry Templates
 * Pre-built templates for different industries
 * Inspired by lead-magnet-quiz vertical templates
 */

module.exports = {
  saas: {
    id: 'saas',
    industry: 'SaaS',
    name: 'B2B SaaS Template',
    description: 'For software-as-a-service products',
    
    recommended_sections: [
      'hero',
      'social_proof',
      'features',
      'how_it_works',
      'pricing',
      'faq',
      'cta'
    ],
    
    design_defaults: {
      style: 'professional',
      primaryColor: '#3b82f6',
      font: 'Inter',
      motionStyle: 'subtle'
    },
    
    copy_tone: 'professional',
    
    typical_features: [
      'User dashboard',
      'API integration',
      'Team collaboration',
      'Analytics',
      'Automation'
    ],
    
    marketing_channels: ['LinkedIn', 'Twitter', 'Product Hunt', 'SEO'],
    
    metrics_focus: ['MRR', 'Churn', 'LTV']
  },

  ecommerce: {
    id: 'ecommerce',
    industry: 'E-commerce',
    name: 'E-commerce Store Template',
    description: 'For online stores and product sales',
    
    recommended_sections: [
      'hero',
      'featured_products',
      'categories',
      'testimonials',
      'trust_badges',
      'newsletter'
    ],
    
    design_defaults: {
      style: 'modern',
      primaryColor: '#10b981',
      font: 'Poppins',
      motionStyle: 'playful'
    },
    
    copy_tone: 'friendly',
    
    typical_features: [
      'Product catalog',
      'Shopping cart',
      'Checkout flow',
      'Order tracking',
      'Inventory management'
    ],
    
    marketing_channels: ['Instagram', 'Facebook Ads', 'Google Shopping', 'Email'],
    
    metrics_focus: ['Revenue', 'AOV', 'Conversion Rate']
  },

  marketplace: {
    id: 'marketplace',
    industry: 'Marketplace',
    name: 'Marketplace Template',
    description: 'For two-sided marketplace platforms',
    
    recommended_sections: [
      'hero',
      'how_it_works',
      'categories',
      'trust_and_safety',
      'pricing',
      'dual_cta'
    ],
    
    design_defaults: {
      style: 'modern',
      primaryColor: '#8b5cf6',
      font: 'Inter',
      motionStyle: 'dynamic'
    },
    
    copy_tone: 'casual',
    
    typical_features: [
      'Seller profiles',
      'Buyer accounts',
      'Search & filters',
      'Messaging system',
      'Payment processing',
      'Reviews & ratings'
    ],
    
    marketing_channels: ['SEO', 'Content Marketing', 'Community', 'Referrals'],
    
    metrics_focus: ['GMV', 'Take Rate', 'Active Users']
  },

  agency: {
    id: 'agency',
    industry: 'Agency/Service',
    name: 'Service Agency Template',
    description: 'For agencies and service businesses',
    
    recommended_sections: [
      'hero',
      'services',
      'portfolio',
      'testimonials',
      'team',
      'contact'
    ],
    
    design_defaults: {
      style: 'professional',
      primaryColor: '#0f172a',
      font: 'Manrope',
      motionStyle: 'subtle'
    },
    
    copy_tone: 'professional',
    
    typical_features: [
      'Service pages',
      'Portfolio showcase',
      'Contact forms',
      'Booking system',
      'Client portal'
    ],
    
    marketing_channels: ['LinkedIn', 'Referrals', 'Content Marketing', 'Networking'],
    
    metrics_focus: ['MRR', 'Project Value', 'Client Retention']
  },

  content: {
    id: 'content',
    industry: 'Content/Education',
    name: 'Content Creator Template',
    description: 'For courses, content, and education',
    
    recommended_sections: [
      'hero',
      'curriculum',
      'social_proof',
      'instructor',
      'pricing',
      'faq'
    ],
    
    design_defaults: {
      style: 'playful',
      primaryColor: '#f59e0b',
      font: 'Outfit',
      motionStyle: 'playful'
    },
    
    copy_tone: 'friendly',
    
    typical_features: [
      'Course platform',
      'Video hosting',
      'Community forum',
      'Progress tracking',
      'Certificates'
    ],
    
    marketing_channels: ['YouTube', 'Email', 'Twitter', 'Webinars'],
    
    metrics_focus: ['Students', 'Completion Rate', 'Revenue']
  },

  default: {
    id: 'default',
    industry: 'General',
    name: 'Default Template',
    description: 'Generic template for any business',
    
    recommended_sections: [
      'hero',
      'features',
      'benefits',
      'social_proof',
      'cta'
    ],
    
    design_defaults: {
      style: 'minimal',
      primaryColor: '#6366f1',
      font: 'Inter',
      motionStyle: 'subtle'
    },
    
    copy_tone: 'professional',
    
    typical_features: [
      'Landing page',
      'Contact form',
      'Newsletter signup'
    ],
    
    marketing_channels: ['SEO', 'Social Media', 'Email'],
    
    metrics_focus: ['Leads', 'Signups', 'Revenue']
  }
};
