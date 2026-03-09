/**
 * Onboarding Choose Validated Idea
 * Browse marketplace and select 1 idea to launch
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Users, DollarSign, Target, Loader2, ArrowRight } from 'lucide-react';
import api from '../lib/api';

export default function OnboardingChooseIdea() {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    loadIdeas();
  }, []);

  async function loadIdeas() {
    try {
      const data = await api.get('/api/ideas');
      setIdeas(data.ideas || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading ideas:', err);
      setLoading(false);
    }
  }

  async function handleLaunchIdea(idea) {
    setSelectedIdea(idea);
    setLaunching(true);

    try {
      const result = await api.post('/api/onboarding/create-company', {
        source: 'validated_idea',
        ideaId: idea.id
      });

      if (result.code === 'NO_SLOTS') {
        alert(`Has alcanzado el límite de negocios (${result.used}/${result.slots}). Compra un hueco extra desde tu panel.`);
        setLaunching(false);
        setSelectedIdea(null);
        return;
      }

      // Set the newly created company as the active selection
      if (result.company?.id) {
        localStorage.setItem('lanzalo_selected_company', result.company.id);
      }
      // Force full reload so App re-fetches profile with onboardingCompleted=true
      window.location.href = '/';
    } catch (err) {
      console.error('Error launching idea:', err);
      if (err?.code === 'NO_SLOTS') {
        alert(`Has alcanzado el límite de negocios de tu plan. Compra un hueco extra desde tu panel.`);
      }
      setLaunching(false);
      setSelectedIdea(null);
    }
  }

  const categories = ['all', ...new Set(ideas.map(i => i.category))];

  const filteredIdeas = ideas
    .filter(idea => {
      const matchesCategory = selectedCategory === 'all' || idea.category === selectedCategory;
      const matchesSearch = idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           idea.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => b.score - a.score); // Sort by score desc

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (launching) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">
            Lanzando {selectedIdea?.title}...
          </h2>
          <p className="text-gray-400">
            Creando empresa, validando idea, y preparando plan...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Ideas Marketplace
          </h1>
          <p className="text-gray-400">
            {ideas.length} ideas validadas con evidencia real de demanda
          </p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-12 pr-4 py-3
                       text-white placeholder-gray-500 focus:border-blue-500 
                       focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3
                     text-white focus:border-blue-500 focus:ring-1 
                     focus:ring-blue-500 outline-none"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'Todas las categorías' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Ideas Grid */}
        {filteredIdeas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron ideas</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredIdeas.map(idea => (
              <div
                key={idea.id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700
                         hover:border-blue-500 transition-all group"
              >
                {/* Score Badge */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`
                    px-3 py-1 rounded-full text-xs font-semibold
                    ${idea.score >= 80 ? 'bg-green-500/20 text-green-400' :
                      idea.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-700 text-gray-400'}
                  `}>
                    Score: {idea.score}
                  </span>
                  <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs">
                    {idea.category}
                  </span>
                </div>

                {/* Title + Description */}
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {idea.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {idea.description}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-400">{idea.demand || 'Alta'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-500" />
                    <span className="text-gray-400">{idea.competition || 'Baja'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-yellow-500" />
                    <span className="text-gray-400">{idea.revenue_potential || 'Alta'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-400">{idea.difficulty || 'Media'}</span>
                  </div>
                </div>

                {/* Source */}
                <p className="text-gray-600 text-xs mb-4">
                  Fuente: {idea.source || 'Trend Scout'}
                </p>

                {/* Launch Button */}
                <button
                  onClick={() => handleLaunchIdea(idea)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3
                           bg-blue-600 hover:bg-blue-500 text-white rounded-lg
                           font-medium transition-colors"
                >
                  Lanzar esta idea
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">
            ¿Prefieres tu propia idea?
          </p>
          <button
            onClick={() => navigate('/discovery')}
            className="text-blue-500 hover:text-blue-400 font-medium"
          >
            Empezar Strategic Discovery →
          </button>
        </div>
      </div>
    </div>
  );
}
