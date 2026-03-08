/**
 * Trial Badge — Muestra días restantes de trial en el dashboard
 */
export default function TrialBadge({ user }) {
  if (!user?.isTrialActive) return null

  const days = user.trialDaysLeft
  const urgent = days <= 3
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
      urgent 
        ? 'bg-red-500/20 border border-red-500/40 text-red-300' 
        : 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
    }`}>
      <span>{urgent ? '⚠️' : '⏳'}</span>
      <span>{days === 1 ? 'Último día de trial' : `${days} días de trial`}</span>
    </div>
  )
}
