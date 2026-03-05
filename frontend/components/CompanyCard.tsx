'use client';

import { motion } from 'framer-motion';

interface Company {
  id: string;
  name: string;
  tagline?: string;
  description: string;
  industry: string;
  subdomain: string;
  status: string;
  revenue_total: number;
  created_at: string;
}

export default function CompanyCard({ company }: { company: Company }) {
  const statusColors = {
    planning: 'bg-yellow-500',
    building: 'bg-blue-500',
    live: 'bg-green-500',
    paused: 'bg-gray-500'
  };

  const statusLabels = {
    planning: 'Planificando',
    building: 'Construyendo',
    live: 'En Vivo',
    paused: 'Pausado'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-blue-500 transition cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">
            {company.name}
          </h3>
          {company.tagline && (
            <p className="text-sm text-slate-400">{company.tagline}</p>
          )}
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[company.status as keyof typeof statusColors]} text-white`}>
          {statusLabels[company.status as keyof typeof statusLabels]}
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-300 text-sm mb-4 line-clamp-2">
        {company.description}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <span>🏢</span>
          <span>{company.industry}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>🌐</span>
          <span>{company.subdomain}.lanzalo.app</span>
        </div>
      </div>

      {/* Revenue */}
      {company.revenue_total > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Ingresos Total</span>
            <span className="text-lg font-bold text-green-400">
              ${company.revenue_total.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 text-xs text-slate-600">
        Creada {new Date(company.created_at).toLocaleDateString('es-ES')}
      </div>
    </motion.div>
  );
}
