/**
 * Onboarding Choose Path
 * User can: describe own idea OR choose validated idea
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, TrendingUp, ArrowRight } from 'lucide-react';

export default function OnboardingChoosePath() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            ¿Tienes idea o exploramos juntos?
          </h1>
          <p className="text-gray-400 text-lg">
            Ambos caminos funcionan. Elige el que prefieras.
          </p>
        </div>

        {/* Two Paths */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Path 1: Own Idea */}
          <button
            onClick={() => navigate('/discovery')}
            className="bg-gray-800 hover:bg-gray-750 border-2 border-gray-700 
                     hover:border-blue-500 rounded-lg p-8 text-left transition-all
                     group"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center 
                            justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                <Lightbulb className="w-7 h-7 text-blue-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Tengo una idea
                </h2>
                <p className="text-gray-400 text-sm">
                  Recomendado si ya sabes qué quieres construir
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  <strong className="text-white">Strategic Discovery:</strong> 28 preguntas
                  para analizar TU situación
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  <strong className="text-white">Unfair Advantages:</strong> Identificamos
                  dónde tienes ventaja única
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  <strong className="text-white">3-5 Paths Ranked:</strong> Te proponemos
                  mejores caminos basados en ti
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  <strong className="text-white">90-Day Plan:</strong> Roadmap personalizado
                  semana a semana
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-blue-500 font-medium 
                          group-hover:text-blue-400">
              <span>Empezar Discovery</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-500 text-xs">
                ⏱️ Toma 15-20 minutos. Vale la pena.
              </p>
            </div>
          </button>

          {/* Path 2: Choose Validated Idea */}
          <button
            onClick={() => navigate('/onboarding/choose-idea')}
            className="bg-gray-800 hover:bg-gray-750 border-2 border-gray-700 
                     hover:border-green-500 rounded-lg p-8 text-left transition-all
                     group"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center 
                            justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
                <TrendingUp className="w-7 h-7 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Sin idea (explora)
                </h2>
                <p className="text-gray-400 text-sm">
                  Mejor si quieres ideas ya validadas
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  <strong className="text-white">Ideas Marketplace:</strong> 50+ ideas
                  validadas con datos reales
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  <strong className="text-white">Trend Scout Agent:</strong> Escanea Reddit,
                  HN buscando oportunidades
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  <strong className="text-white">Score 0-100:</strong> Ranking por demanda,
                  competencia, revenue potential
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  <strong className="text-white">1-Click Launch:</strong> Elige idea →
                  Creamos empresa automáticamente
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-green-500 font-medium 
                          group-hover:text-green-400">
              <span>Ver ideas validadas</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-500 text-xs">
                🎯 Ideas con evidencia real de demanda
              </p>
            </div>
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            No te preocupes, puedes cambiar después.
          </p>
          <p className="text-gray-600 text-xs mt-2">
            Ambos paths te dan acceso completo a Lanzalo
          </p>
        </div>
      </div>
    </div>
  );
}
