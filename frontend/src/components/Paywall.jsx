/**
 * Paywall Component — Lanzalo
 * Se muestra cuando el trial expira y el usuario no tiene plan Pro.
 * Excepción: "Descubre Ideas" sigue accesible.
 */
import { apiUrl } from '../api.js'

export default function Paywall({ user, onUpgrade }) {
  const handleSubscribe = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(apiUrl('/api/payments/create-checkout'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Error creando checkout:', err)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/25">
          <span className="text-4xl">⏰</span>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-3">
          Tu prueba de 14 días ha terminado
        </h2>
        
        <p className="text-gray-400 mb-6 leading-relaxed">
          Pero tranquilo — tu negocio sigue ahí, esperándote. 
          Suscríbete para seguir construyendo con tu co-fundador IA.
        </p>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 mb-6">
          <div className="text-3xl font-bold text-white mb-1">$39<span className="text-lg text-gray-400">/mes</span></div>
          <p className="text-gray-400 text-sm mb-4">Por negocio • Sin compromiso • Cancela cuando quieras</p>
          
          <ul className="text-left text-sm text-gray-300 space-y-2 mb-6">
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> 20 créditos de generación/mes</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Agentes IA trabajando 24/7</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Email marketing + SEO + Ads</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Pedir cambios ilimitados</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Soporte directo</li>
          </ul>

          <button
            onClick={handleSubscribe}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/25"
          >
            Suscribirme ahora 🚀
          </button>
        </div>

        <p className="text-xs text-gray-500">
          💡 Mientras tanto, puedes seguir explorando <a href="/ideas" className="text-blue-400 hover:underline">Descubre Ideas</a>
        </p>
      </div>
    </div>
  )
}
