/**
 * Credits Badge — Muestra créditos restantes en el sidebar
 */
export default function CreditsBadge({ user }) {
  const credits = user?.credits?.total ?? 0
  const low = credits <= 2
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
      low
        ? 'bg-orange-500/10 border border-orange-500/30'
        : 'bg-gray-800/50 border border-gray-700/50'
    }`}>
      <span>🎫</span>
      <span className={low ? 'text-orange-300 font-medium' : 'text-gray-300'}>
        {credits} crédito{credits !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
