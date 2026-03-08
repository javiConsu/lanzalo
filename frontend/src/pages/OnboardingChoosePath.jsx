/**
 * Onboarding Choose Path
 * User can: describe own idea (quick), deep discovery, or browse validated ideas
 */

import { useNavigate } from 'react-router-dom';
import { Rocket, Lightbulb, TrendingUp, ArrowRight } from 'lucide-react';

export default function OnboardingChoosePath() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-5xl w-full">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            ¿Cómo quieres empezar?
          </h1>
          <p className="text-gray-400 text-lg">
            Elige tu camino. Puedes cambiar después.
          </p>
        </div>

        {/* Three Paths */}
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Path 1: Quick - Describe Idea (RECOMMENDED) */}
          <button
            onClick={() => navigate('/onboarding/describe-idea')}
            className="bg-gray-800 hover:bg-gray-750 border-2 border-emerald-500/50 
                     hover:border-emerald-500 rounded-lg p-6 text-left transition-all
                     group relative"
          >
            {/* Recommended badge */}
            <div className="absolute -top-3 left-6">
              <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">
                RECOMENDADO
              </span>
            </div>

            <div className="flex items-start gap-3 mb-4 mt-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center 
                            justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                <Rocket className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  Tengo mi idea clara
                </h2>
                <p className="text-gray-400 text-sm">
                  Descríbela en 2 frases y lanza
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  30 segundos y estás dentro
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  Tu Co-Fundador IA valida al instante
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  Empiezas a construir hoy
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-emerald-500 font-medium 
                          group-hover:text-emerald-400">
              <span>Describir idea</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-gray-500 text-xs">
                ⚡ El camino más rápido
              </p>
            </div>
          </button>

          {/* Path 2: Deep Discovery */}
          <button
            onClick={() => navigate('/discovery')}
            className="bg-gray-800 hover:bg-gray-750 border-2 border-gray-700 
                     hover:border-blue-500 rounded-lg p-6 text-left transition-all
                     group"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center 
                            justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                <Lightbulb className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  Quiero explorar bien
                </h2>
                <p className="text-gray-400 text-sm">
                  Strategic Discovery completo
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  28 preguntas sobre TU situación
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  Unfair Advantages detectadas
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  3-5 paths + plan de 90 días
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-blue-500 font-medium 
                          group-hover:text-blue-400">
              <span>Empezar Discovery</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-gray-500 text-xs">
                ⏱️ 15-20 minutos. Muy potente.
              </p>
            </div>
          </button>

          {/* Path 3: Browse Validated Ideas */}
          <button
            onClick={() => navigate('/onboarding/choose-idea')}
            className="bg-gray-800 hover:bg-gray-750 border-2 border-gray-700 
                     hover:border-amber-500 rounded-lg p-6 text-left transition-all
                     group"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center 
                            justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                <TrendingUp className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  Sin idea aún
                </h2>
                <p className="text-gray-400 text-sm">
                  Ideas ya validadas para lanzar
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  50+ ideas con datos reales
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  Score de demanda y competencia
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  1-Click Launch
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-amber-500 font-medium 
                          group-hover:text-amber-400">
              <span>Ver ideas validadas</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-gray-500 text-xs">
                🎯 Ideas con evidencia de demanda
              </p>
            </div>
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-10 text-center">
          <p className="text-gray-600 text-xs">
            Todos los caminos te dan acceso completo a Lánzalo
          </p>
        </div>
      </div>
    </div>
  );
}
