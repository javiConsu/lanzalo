/**
 * Onboarding Describe Idea
 * Quick path: describe your idea in a few words → create company → chat
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, ArrowLeft, Loader2 } from 'lucide-react';
import api from '../lib/api';

export default function OnboardingDescribeIdea() {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState('');
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim()) return;

    setLaunching(true);
    setError(null);

    try {
      const result = await api.post('/api/onboarding/create-company', {
        source: 'user_idea',
        description: description.trim(),
        audience: audience.trim() || 'General'
      });

      if (result.success && result.company) {
        // Set the newly created company as the active selection
        localStorage.setItem('lanzalo_selected_company', result.company.id);
        // Force full reload so App re-fetches profile with onboardingCompleted=true
        window.location.href = '/';
      } else if (result.code === 'NO_SLOTS') {
        setError(`Has alcanzado el límite de negocios (${result.used}/${result.slots}). Compra un hueco extra desde tu panel.`);
        setLaunching(false);
      } else {
        setError(result.error || 'Error creando la empresa');
        setLaunching(false);
      }
    } catch (err) {
      console.error('Error creating company:', err);
      // Check if the error response has NO_SLOTS code
      if (err?.response?.code === 'NO_SLOTS' || err?.code === 'NO_SLOTS') {
        setError('Has alcanzado el límite de negocios de tu plan. Compra un hueco extra desde tu panel.');
      } else {
        setError('Error al crear la empresa. Intenta de nuevo.');
      }
      setLaunching(false);
    }
  }

  if (launching) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">
            Creando tu proyecto...
          </h2>
          <p className="text-gray-400">
            Tu Co-Fundador IA está preparando todo. Un momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-xl w-full">

        {/* Back button */}
        <button
          onClick={() => navigate('/onboarding/choose-path')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <Rocket className="w-7 h-7 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Describe tu idea
          </h1>
          <p className="text-gray-400">
            No hace falta que sea perfecta. Tu Co-Fundador IA te ayudará a refinarla y te propondrá nombres.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ¿Qué hace? (2-3 frases)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Una app que genera planes de comida personalizados usando IA. El usuario mete sus objetivos (perder peso, ganar músculo) y recibe recetas semanales con lista de compra."
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3
                       text-white placeholder-gray-500 focus:border-emerald-500 
                       focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
              required
              maxLength={1000}
            />
          </div>

          {/* Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ¿Para quién es? <span className="text-gray-500">(opcional)</span>
            </label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Ej: Freelancers, restaurantes pequeños, mamás primerizas..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3
                       text-white placeholder-gray-500 focus:border-emerald-500 
                       focus:ring-1 focus:ring-emerald-500 outline-none"
              maxLength={200}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!description.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-4
                     bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg
                     transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                     text-lg"
          >
            <Rocket className="w-5 h-5" />
            Lanzar proyecto
          </button>

          <p className="text-center text-gray-600 text-xs">
            Tu Co-Fundador IA validará la idea y creará un plan de acción.
          </p>
        </form>
      </div>
    </div>
  );
}
