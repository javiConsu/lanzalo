'use client';

import { motion } from 'framer-motion';

interface StatsProps {
  stats: {
    totalCompanies: number;
    activeNow: number;
    totalRevenue: number;
    tasksCompleted: number;
  };
}

export default function Stats({ stats }: StatsProps) {
  const statCards = [
    {
      label: 'Empresas Totales',
      value: stats.totalCompanies,
      icon: '🏢',
      color: 'from-blue-500 to-blue-600'
    },
    {
      label: 'Activas Ahora',
      value: stats.activeNow,
      icon: '⚡',
      color: 'from-green-500 to-green-600'
    },
    {
      label: 'Ingresos Total',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: '💰',
      color: 'from-purple-500 to-purple-600'
    },
    {
      label: 'Tareas Completadas',
      value: stats.tasksCompleted,
      icon: '✅',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`bg-gradient-to-br ${stat.color} rounded-xl p-6 text-white shadow-lg`}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-4xl">{stat.icon}</span>
            <div className="text-right">
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-sm opacity-90 mt-1">{stat.label}</div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
