'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import LiveFeed from '@/components/LiveFeed';
import CompanyCard from '@/components/CompanyCard';
import Stats from '@/components/Stats';

export default function Home() {
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeNow: 0,
    totalRevenue: 0,
    tasksCompleted: 0
  });

  useEffect(() => {
    // Fetch companies and stats
    fetchDashboardData();
    
    // Poll every 10 seconds
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setCompanies(data.companies);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero */}
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl font-bold text-white mb-4">
            Lanzalo
          </h1>
          <p className="text-xl text-slate-400">
            IA que maneja tu empresa mientras duermes
          </p>
        </motion.div>

        {/* Stats */}
        <Stats stats={stats} />

        {/* Live Feed */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">
            🔴 Actividad en Vivo
          </h2>
          <LiveFeed />
        </div>

        {/* Companies Grid */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">
            Empresas Activas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16 mt-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            ¿Listo para lanzar tu empresa con IA?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            $39/mes + 20% de las ganancias. Cancela cuando quieras.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-bold shadow-xl hover:shadow-2xl transition"
          >
            Empezar Ahora →
          </motion.button>
        </div>
      </div>
    </main>
  );
}
