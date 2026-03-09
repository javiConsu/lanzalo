/**
 * Settings — Panel de configuración de la cuenta
 * Secciones: Mis Negocios, Perfil, Contraseña, Referidos
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../api.js'

const token = () => localStorage.getItem('token')
const headers = () => ({ 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' })

export default function Settings() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [companies, setCompanies] = useState({ companies: [], used: 0, slots: 1, available: 0 })
  const [referral, setReferral] = useState(null)
  const [loading, setLoading] = useState(true)

  // Profile form
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)

  // Password form
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg, setPwdMsg] = useState(null)

  // Referral
  const [copied, setCopied] = useState(false)

  // Slot purchase
  const [buyingSlot, setBuyingSlot] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(apiUrl('/api/user/profile'), { headers: headers() }).then(r => r.json()),
      fetch(apiUrl('/api/user/companies-list'), { headers: headers() }).then(r => r.json()).catch(() => null),
      fetch(apiUrl('/api/user/referral-info'), { headers: headers() }).then(r => r.json()).catch(() => null),
    ]).then(([profileData, companiesData, referralData]) => {
      if (profileData.user) {
        setUser(profileData.user)
        setProfileName(profileData.user.name || '')
        setProfileEmail(profileData.user.email || '')
      }
      if (companiesData) setCompanies(companiesData)
      if (referralData) setReferral(referralData)
      setLoading(false)
    })
  }, [])

  const saveProfile = async () => {
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      const res = await fetch(apiUrl('/api/user/profile'), {
        method: 'PATCH', headers: headers(),
        body: JSON.stringify({ name: profileName, email: profileEmail })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setProfileMsg({ type: 'success', text: 'Perfil actualizado' })
        setUser(prev => ({ ...prev, name: data.user.name, email: data.user.email }))
      } else {
        setProfileMsg({ type: 'error', text: data.error || 'Error actualizando' })
      }
    } catch (e) {
      setProfileMsg({ type: 'error', text: 'Error de conexión' })
    }
    setProfileSaving(false)
  }

  const changePassword = async () => {
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'error', text: 'Las contraseñas no coinciden' })
      return
    }
    if (newPwd.length < 8) {
      setPwdMsg({ type: 'error', text: 'Mínimo 8 caracteres' })
      return
    }
    setPwdSaving(true)
    setPwdMsg(null)
    try {
      const res = await fetch(apiUrl('/api/user/change-password'), {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setPwdMsg({ type: 'success', text: 'Contraseña actualizada' })
        setCurrentPwd('')
        setNewPwd('')
        setConfirmPwd('')
      } else {
        setPwdMsg({ type: 'error', text: data.error || 'Error cambiando contraseña' })
      }
    } catch (e) {
      setPwdMsg({ type: 'error', text: 'Error de conexión' })
    }
    setPwdSaving(false)
  }

  const purchaseSlot = async () => {
    setBuyingSlot(true)
    try {
      const res = await fetch(apiUrl('/api/credits/purchase-slot'), {
        method: 'POST', headers: headers()
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setBuyingSlot(false)
    } catch (e) {
      setBuyingSlot(false)
    }
  }

  const copyReferralLink = () => {
    if (!referral?.referralLink) return
    navigator.clipboard.writeText(referral.referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Cargando configuración...</div>
      </div>
    )
  }

  const slotsExhausted = companies.available <= 0

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-white transition-colors text-sm"
          >
            ← Volver
          </button>
          <h1 className="text-xl font-bold text-white">Configuración</h1>
        </div>

        {/* ═══ MIS NEGOCIOS ═══ */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🏢</span>
            <h2 className="text-base font-semibold text-white">Mis negocios</h2>
          </div>

          {/* Slot counter */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-2xl font-bold text-white">{companies.used}</span>
              <span className="text-gray-500 text-lg">/{companies.slots}</span>
            </div>
            <span className="text-xs text-gray-500">negocios usados</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-gray-800 rounded-full mb-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${slotsExhausted ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, (companies.used / companies.slots) * 100)}%` }}
            />
          </div>

          {/* Company list */}
          {companies.companies.length > 0 && (
            <div className="space-y-2 mb-4">
              {companies.companies.map(c => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-xs">🚀</div>
                    <span className="text-sm text-white">{c.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
                    c.status === 'planning' ? 'bg-amber-500/15 text-amber-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {c.status === 'active' ? 'Activo' : c.status === 'planning' ? 'Planificando' : c.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Status / CTA */}
          {slotsExhausted ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
              <p className="text-red-400 text-xs font-medium mb-1">Sin huecos</p>
              <p className="text-red-400/80 text-xs">
                Has alcanzado el límite de negocios de tu plan. Compra un hueco extra para crear otro.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-3">
              <p className="text-emerald-400 text-xs">
                Te {companies.available === 1 ? 'queda' : 'quedan'} <strong>{companies.available}</strong> hueco{companies.available !== 1 ? 's' : ''} disponible{companies.available !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          <button
            onClick={purchaseSlot}
            disabled={buyingSlot}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
          >
            {buyingSlot ? 'Redirigiendo a pago...' : 'Comprar hueco extra — 39€/mes'}
          </button>
        </section>

        {/* ═══ PERFIL ═══ */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">👤</span>
            <h2 className="text-base font-semibold text-white">Perfil</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nombre</label>
              <input
                type="text"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={profileEmail}
                onChange={e => setProfileEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="tu@email.com"
              />
            </div>

            {profileMsg && (
              <p className={`text-xs ${profileMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {profileMsg.text}
              </p>
            )}

            <button
              onClick={saveProfile}
              disabled={profileSaving || (!profileName.trim() && !profileEmail.trim())}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition-colors disabled:opacity-50"
            >
              {profileSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </section>

        {/* ═══ CONTRASEÑA ═══ */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🔒</span>
            <h2 className="text-base font-semibold text-white">Contraseña</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Contraseña actual</label>
              <input
                type="password"
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="Repite la nueva contraseña"
              />
            </div>

            {pwdMsg && (
              <p className={`text-xs ${pwdMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {pwdMsg.text}
              </p>
            )}

            <button
              onClick={changePassword}
              disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition-colors disabled:opacity-50"
            >
              {pwdSaving ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </section>

        {/* ═══ REFERIDOS ═══ */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🎁</span>
            <h2 className="text-base font-semibold text-white">Invita y gana</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Invita a un amigo. Si contrata, tú recibes <strong className="text-emerald-400">20 créditos gratis</strong>.
          </p>

          {referral && (
            <div className="space-y-3">
              {/* Referral link */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={referral.referralLink || ''}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none select-all"
                />
                <button
                  onClick={copyReferralLink}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                  }`}
                >
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>

              {/* Code */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>Tu código: <strong className="text-white font-mono">{referral.referralCode}</strong></span>
              </div>

              {/* Stats */}
              <div className="flex gap-4 pt-2 border-t border-gray-800">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{referral.totalReferred}</div>
                  <div className="text-xs text-gray-500">Referidos</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-400">{referral.totalCreditsEarned}</div>
                  <div className="text-xs text-gray-500">Créditos ganados</div>
                </div>
              </div>

              {/* Conversions list */}
              {referral.conversions?.length > 0 && (
                <div className="pt-2 border-t border-gray-800 space-y-1.5">
                  <p className="text-xs text-gray-500 font-medium">Historial</p>
                  {referral.conversions.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{c.email}</span>
                      <span className="text-emerald-400">+{c.credits_awarded} créditos</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Bottom spacing */}
        <div className="h-8" />
      </div>
    </div>
  )
}
