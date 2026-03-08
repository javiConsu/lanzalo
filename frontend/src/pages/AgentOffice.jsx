/**
 * AgentOffice — Oficina pixel-art de agentes en tiempo real
 * Inspirado en Star-Office-UI (ringhyacinth/Star-Office-UI)
 * Adaptado para Lánzalo: 7 agentes IA con sprites pixel-art y estados en vivo
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { apiUrl, API_URL } from '../api.js'

// ─── Agent definitions ─────────────────────────────────────
const AGENT_DEFS = {
  ceo:       { name: 'Co-Founder', emoji: '🧠', color: '#10b981', sprite: '/office-assets/agents/ceo.png',       role: 'Tu socio IA' },
  code:      { name: 'Code',      emoji: '💻', color: '#3b82f6', sprite: '/office-assets/agents/code.png',      role: 'Escribe código' },
  marketing: { name: 'Marketing', emoji: '📣', color: '#ec4899', sprite: '/office-assets/agents/marketing.png', role: 'Estrategia y contenido' },
  email:     { name: 'Email',     emoji: '📧', color: '#f59e0b', sprite: '/office-assets/agents/email.png',     role: 'Cold outreach' },
  research:  { name: 'Research',  emoji: '🔍', color: '#8b5cf6', sprite: '/office-assets/agents/research.png',  role: 'Investigación de mercado' },
  data:      { name: 'Data',      emoji: '📊', color: '#06b6d4', sprite: '/office-assets/agents/data.png',      role: 'Análisis y métricas' },
  twitter:   { name: 'Twitter',   emoji: '🐦', color: '#6366f1', sprite: '/office-assets/agents/twitter.png',   role: 'Redes sociales' },
}

// State → Spanish label + area in the office
const STATE_INFO = {
  idle:        { label: 'Descansando', area: 'breakroom', icon: '💤' },
  writing:     { label: 'Escribiendo', area: 'desk', icon: '✍️' },
  researching: { label: 'Investigando', area: 'library', icon: '🔎' },
  executing:   { label: 'Ejecutando', area: 'desk', icon: '⚡' },
  syncing:     { label: 'Sincronizando', area: 'server', icon: '🔄' },
  error:       { label: 'Error', area: 'bug', icon: '🐛' },
}

// Bubble texts por estado
const BUBBLE_TEXTS = {
  idle: [
    'Echándome un café virtual...',
    'Descansando los transistores',
    'Aquí, esperando órdenes jefe',
    'Me pido el sofá',
    'Cargando baterías...',
    'Zen mode: activado',
    'Nadie me ha dado tarea. Sospechoso.',
    'Esto de no hacer nada cansa, ¿eh?',
    'A ver si el jefe se decide...',
    'Esperando instrucciones...',
    'Listo para lo que haga falta',
    'Aquí quietecito por ahora',
    'Recargando pilas ⚡',
  ],
  writing: [
    'No me molestes, estoy en racha',
    'Picando código a toda máquina',
    'Esto va a quedar fino...',
    'Escribiendo cosas importantes™',
    'Dame 5 minutos más...',
    'Concentrado. Nivel: monje budista.',
  ],
  researching: [
    'Investigando como un CSI',
    'Buceando en datos...',
    'He encontrado algo interesante',
    'Leyendo papers a velocidad luz',
    'La competencia no sabe lo que viene',
    'Sacando conclusiones...',
  ],
  executing: [
    'Ejecutando — no tocar',
    '¡Vamos, que nos vamos!',
    'Pipeline en marcha 🚀',
    'Esto va viento en popa',
    'Trabajando a toda máquina',
    'Dale, dale, dale...',
  ],
  syncing: [
    'Guardando el chiringuito...',
    'Sincronizando con el universo',
    'Backup listo, tranqui',
    'Todo bajo control',
  ],
  error: [
    'Houston, tenemos un problema',
    'Algo ha petado. Investigando...',
    'Bug encontrado. Cazándolo.',
    'Error 💀 pero no pasa nada',
    'Me he tropezado con un bug',
  ],
}

function getRandomBubble(state) {
  const texts = BUBBLE_TEXTS[state] || BUBBLE_TEXTS.idle
  return texts[Math.floor(Math.random() * texts.length)]
}

// ─── Helpers ───────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ─── Pixel Art Canvas Component ────────────────────────────
function OfficeCanvas({ agents, width, height, companyName }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const bgImageRef = useRef(null)
  const spriteImgsRef = useRef({})
  const timeRef = useRef(0)
  const bubblesRef = useRef({})
  const agentPositionsRef = useRef({})

  // Office zone positions (in % of canvas — mapped to the BG image zones)
  const AREA_POSITIONS = useMemo(() => ({
    // Desks — top-left area (computers visible)
    desk: [
      { x: 0.14, y: 0.55 },
      { x: 0.22, y: 0.55 },
      { x: 0.14, y: 0.70 },
      { x: 0.22, y: 0.70 },
    ],
    // Library — top-center (bookshelves)
    library: [
      { x: 0.36, y: 0.28 },
      { x: 0.44, y: 0.28 },
      { x: 0.40, y: 0.40 },
    ],
    // Breakroom — center (sofa + coffee)
    breakroom: [
      { x: 0.42, y: 0.55 },
      { x: 0.50, y: 0.48 },
      { x: 0.58, y: 0.55 },
      { x: 0.45, y: 0.65 },
      { x: 0.55, y: 0.65 },
      { x: 0.50, y: 0.58 },
      { x: 0.48, y: 0.72 },
    ],
    // Server room — top-right (server racks)
    server: [
      { x: 0.80, y: 0.30 },
      { x: 0.88, y: 0.30 },
    ],
    // Bug zone — bottom-right (papers scattered)
    bug: [
      { x: 0.75, y: 0.72 },
      { x: 0.82, y: 0.72 },
    ],
  }), [])

  // Load background
  useEffect(() => {
    const img = new Image()
    img.src = '/office-assets/office_bg_lanzalo.png'
    img.onload = () => { bgImageRef.current = img }
    // Fallback
    img.onerror = () => {
      const fallback = new Image()
      fallback.src = '/office-assets/office_bg.webp'
      fallback.onload = () => { bgImageRef.current = fallback }
    }
  }, [])

  // Load sprite images
  useEffect(() => {
    Object.entries(AGENT_DEFS).forEach(([type, def]) => {
      if (def.sprite && !spriteImgsRef.current[type]) {
        const img = new Image()
        img.src = def.sprite
        img.onload = () => { spriteImgsRef.current[type] = img }
      }
    })
  }, [])

  // Initialize bubbles on state change
  useEffect(() => {
    Object.entries(agents).forEach(([type, agent]) => {
      if (!bubblesRef.current[type] || bubblesRef.current[type].state !== agent.state) {
        bubblesRef.current[type] = {
          text: getRandomBubble(agent.state),
          state: agent.state,
          timer: Math.random() * 5, // Stagger start times
          showBubble: true,
        }
      }
    })
  }, [agents])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const agentList = Object.entries(agents)

    // Track smooth position transitions
    agentList.forEach(([type]) => {
      if (!agentPositionsRef.current[type]) {
        agentPositionsRef.current[type] = { x: width * 0.5, y: height * 0.5 }
      }
    })

    let lastTime = 0
    const draw = (timestamp) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05)
      lastTime = timestamp
      timeRef.current = timestamp / 1000

      ctx.clearRect(0, 0, width, height)

      // Draw background
      if (bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, width, height)
        // Slight darkening overlay for depth
        ctx.fillStyle = 'rgba(0, 0, 10, 0.12)'
        ctx.fillRect(0, 0, width, height)
      } else {
        // Fallback dark office
        const grad = ctx.createRadialGradient(width * 0.5, height * 0.4, 50, width * 0.5, height * 0.5, width * 0.7)
        grad.addColorStop(0, '#2a2540')
        grad.addColorStop(1, '#151020')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, width, height)
      }

      // Count agents per area for positioning
      const areaCounters = {}

      // Sort agents by y-position for proper layering
      const sortedAgents = [...agentList].sort(([, a], [, b]) => {
        const areaA = (STATE_INFO[a.state] || STATE_INFO.idle).area
        const areaB = (STATE_INFO[b.state] || STATE_INFO.idle).area
        const posA = agentPositionsRef.current[a.type]?.y || 0
        const posB = agentPositionsRef.current[b.type]?.y || 0
        return posA - posB
      })

      // Draw each agent
      sortedAgents.forEach(([type, agent], i) => {
        const stateInfo = STATE_INFO[agent.state] || STATE_INFO.idle
        const area = stateInfo.area
        if (!areaCounters[area]) areaCounters[area] = 0
        const areaIndex = areaCounters[area]++
        const positions = AREA_POSITIONS[area] || AREA_POSITIONS.breakroom
        const pos = positions[areaIndex % positions.length]
        const targetX = pos.x * width
        const targetY = pos.y * height

        // Smooth movement (lerp towards target)
        const current = agentPositionsRef.current[type]
        const lerpSpeed = 2.5
        current.x += (targetX - current.x) * lerpSpeed * dt
        current.y += (targetY - current.y) * lerpSpeed * dt

        const t = timeRef.current
        const agentColor = AGENT_DEFS[type]?.color || '#888'

        // Subtle bob animation
        const bobY = Math.sin(t * 2 + i * 1.1) * 2.5
        const x = current.x
        const y = current.y + bobY

        // Sprite size (scaled to canvas)
        const spriteScale = Math.min(width, height) / 14
        const spriteSize = Math.max(40, Math.min(spriteScale, 70))

        // Shadow under character
        ctx.save()
        ctx.beginPath()
        ctx.ellipse(x, y + spriteSize * 0.45, spriteSize * 0.35, spriteSize * 0.1, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fill()
        ctx.restore()

        // Active glow
        if (agent.state !== 'idle') {
          ctx.save()
          const glowPulse = 0.3 + Math.sin(t * 3 + i) * 0.15
          const grd = ctx.createRadialGradient(x, y, spriteSize * 0.2, x, y, spriteSize * 0.8)
          grd.addColorStop(0, agentColor + Math.round(glowPulse * 255).toString(16).padStart(2, '0'))
          grd.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = grd
          ctx.beginPath()
          ctx.arc(x, y, spriteSize * 0.8, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        // Draw sprite image
        const spriteImg = spriteImgsRef.current[type]
        if (spriteImg) {
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(
            spriteImg,
            x - spriteSize * 0.5,
            y - spriteSize * 0.5,
            spriteSize,
            spriteSize
          )
          ctx.imageSmoothingEnabled = true
        } else {
          // Fallback: colored circle with emoji
          ctx.beginPath()
          ctx.arc(x, y, spriteSize * 0.35, 0, Math.PI * 2)
          ctx.fillStyle = agentColor
          ctx.fill()
          ctx.strokeStyle = 'rgba(255,255,255,0.3)'
          ctx.lineWidth = 1.5
          ctx.stroke()
          ctx.font = `${spriteSize * 0.35}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(AGENT_DEFS[type]?.emoji || '🤖', x, y)
        }

        // Name label below sprite
        ctx.font = `bold ${Math.max(9, spriteSize * 0.16)}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        const nameText = AGENT_DEFS[type]?.name || type
        const nameMetrics = ctx.measureText(nameText)
        const nameW = nameMetrics.width + 10
        const nameH = 16
        const nameY = y + spriteSize * 0.45

        // Name pill background
        ctx.fillStyle = 'rgba(10, 10, 25, 0.8)'
        roundRect(ctx, x - nameW / 2, nameY, nameW, nameH, 4)
        ctx.fill()
        ctx.strokeStyle = agentColor + '60'
        ctx.lineWidth = 0.5
        roundRect(ctx, x - nameW / 2, nameY, nameW, nameH, 4)
        ctx.stroke()
        ctx.fillStyle = '#e2e8f0'
        ctx.fillText(nameText, x, nameY + 2)

        // State icon badge
        if (agent.state !== 'idle') {
          const badgeX = x + spriteSize * 0.35
          const badgeY = y - spriteSize * 0.4
          ctx.font = `${Math.max(11, spriteSize * 0.22)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(stateInfo.icon, badgeX, badgeY)
        }

        // Speech bubble
        const bubble = bubblesRef.current[type]
        if (bubble) {
          bubble.timer += dt
          if (bubble.timer > 8) {
            bubble.text = getRandomBubble(agent.state)
            bubble.timer = 0
          }

          // Only show bubble for a portion of the cycle
          const showStart = 0.3
          const showEnd = 6.5
          const fadeIn = 0.4
          const fadeOut = 0.5

          if (bubble.timer > showStart && bubble.timer < showEnd + fadeOut) {
            let alpha = 1
            if (bubble.timer < showStart + fadeIn) {
              alpha = (bubble.timer - showStart) / fadeIn
            } else if (bubble.timer > showEnd) {
              alpha = 1 - (bubble.timer - showEnd) / fadeOut
            }

            ctx.save()
            ctx.globalAlpha = Math.max(0, alpha) * 0.92
            ctx.font = `${Math.max(9, spriteSize * 0.15)}px monospace`
            ctx.textAlign = 'center'
            const bubbleText = bubble.text
            const tw = ctx.measureText(bubbleText).width + 16
            const bx = x
            const by = y - spriteSize * 0.55

            // Bubble background
            roundRect(ctx, bx - tw / 2, by - 20, tw, 22, 6)
            ctx.fillStyle = 'rgba(12, 12, 28, 0.92)'
            ctx.fill()
            ctx.strokeStyle = agentColor + '50'
            ctx.lineWidth = 1
            roundRect(ctx, bx - tw / 2, by - 20, tw, 22, 6)
            ctx.stroke()

            // Bubble tail
            ctx.fillStyle = 'rgba(12, 12, 28, 0.92)'
            ctx.beginPath()
            ctx.moveTo(bx - 4, by + 2)
            ctx.lineTo(bx, by + 8)
            ctx.lineTo(bx + 4, by + 2)
            ctx.fill()

            // Text
            ctx.textBaseline = 'middle'
            ctx.fillStyle = '#cbd5e1'
            ctx.fillText(bubbleText, bx, by - 9)
            ctx.restore()
          }
        }
      })

      // Bottom plaque with company name
      const plaqueW = Math.min(380, width * 0.35)
      const plaqueH = 30
      const plaqueX = (width - plaqueW) / 2
      const plaqueY = height - plaqueH - 10
      ctx.fillStyle = 'rgba(15, 15, 35, 0.88)'
      roundRect(ctx, plaqueX, plaqueY, plaqueW, plaqueH, 8)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)'
      ctx.lineWidth = 1
      roundRect(ctx, plaqueX, plaqueY, plaqueW, plaqueH, 8)
      ctx.stroke()

      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fbbf24'
      ctx.fillText('⭐', plaqueX + 14, plaqueY + plaqueH / 2)
      ctx.fillText('⭐', plaqueX + plaqueW - 14, plaqueY + plaqueH / 2)
      ctx.fillStyle = '#d1d5db'
      const label = companyName ? `Oficina de Agentes — ${companyName}` : 'Oficina de Agentes — Lánzalo'
      ctx.fillText(label, width / 2, plaqueY + plaqueH / 2)

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [agents, width, height, companyName, AREA_POSITIONS])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full h-auto rounded-2xl border border-gray-700/30"
      style={{ imageRendering: 'pixelated', maxHeight: '100%' }}
    />
  )
}

// ─── Agent Status Panel (sidebar) ──────────────────────────
function AgentPanel({ agents, totalActive, totalInProgress }) {
  const agentList = Object.entries(agents)

  return (
    <div className="flex flex-col gap-3 overflow-y-auto">
      {/* Summary */}
      <div className="bg-gray-900/50 rounded-2xl border border-gray-700/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">🏢</span>
          <span className="text-sm font-semibold text-white">Estado del equipo</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-400">{agentList.length}</div>
            <div className="text-xs text-gray-500">Agentes</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400">{totalInProgress}</div>
            <div className="text-xs text-gray-500">Activos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400">{totalActive}</div>
            <div className="text-xs text-gray-500">Tareas</div>
          </div>
        </div>
      </div>

      {/* Agent list */}
      <div className="bg-gray-900/50 rounded-2xl border border-gray-700/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700/50">
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="text-xs">🤖</span> Agentes en vivo
          </span>
        </div>
        <div className="divide-y divide-gray-800/50">
          {agentList.map(([type, agent]) => {
            const stateInfo = STATE_INFO[agent.state] || STATE_INFO.idle
            const def = AGENT_DEFS[type] || {}
            const isActive = agent.state !== 'idle'
            const isError = agent.state === 'error'

            return (
              <div key={type} className="px-4 py-3 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  {/* Agent avatar — use sprite */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 ${
                      isError ? 'bg-red-500/20' : isActive ? 'bg-emerald-500/20' : 'bg-gray-800/80'
                    }`}
                    style={isActive && !isError ? { boxShadow: `0 0 10px ${def.color}30` } : {}}
                  >
                    <img
                      src={def.sprite}
                      alt={def.name}
                      className="w-8 h-8"
                      style={{ imageRendering: 'pixelated' }}
                      onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = def.emoji }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{def.name}</span>
                      {isActive && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isError ? 'bg-red-400' : 'bg-emerald-400'} animate-pulse`} />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {stateInfo.icon} {agent.detail || stateInfo.label}
                    </p>
                  </div>

                  {/* Task count badges */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {agent.tasksInProgress > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        {agent.tasksInProgress}
                      </span>
                    )}
                    {agent.tasksQueued > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-400">
                        +{agent.tasksQueued}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-900/50 rounded-2xl border border-gray-700/50 p-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(STATE_INFO).map(([state, info]) => (
            <div key={state} className="flex items-center gap-1.5">
              <span className="text-xs">{info.icon}</span>
              <span className="text-xs text-gray-500">{info.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main AgentOffice Page ─────────────────────────────────
export default function AgentOffice() {
  // Default agents — always show all 7, even with no tasks
  const DEFAULT_AGENTS = useMemo(() => Object.fromEntries(
    Object.entries(AGENT_DEFS).map(([type, def]) => [type, {
      ...def, type, state: 'idle', detail: 'Descansando...', tasksInProgress: 0, tasksQueued: 0
    }])
  ), [])

  const [agents, setAgents] = useState(DEFAULT_AGENTS)
  const [stats, setStats] = useState({ totalActive: 0, totalInProgress: 0, totalQueued: 0 })
  const [companyId, setCompanyId] = useState(null)
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 450 })
  const containerRef = useRef(null)
  const token = localStorage.getItem('token')

  // Load companies
  useEffect(() => {
    fetch(apiUrl('/api/user/companies'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        const list = d.companies || []
        setCompanies(list)
        if (list[0]) setCompanyId(list[0].id)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token])

  // Fetch agent statuses (poll every 5s)
  useEffect(() => {
    if (!companyId) return

    const fetchStatus = () => {
      fetch(apiUrl(`/api/user/companies/${companyId}/agents/status`), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.agents) {
            setAgents(data.agents)
            setStats({
              totalActive: data.totalActive || 0,
              totalInProgress: data.totalInProgress || 0,
              totalQueued: data.totalQueued || 0,
            })
          }
        })
        .catch(() => {}) // Keep default agents on error
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [companyId, token])

  // WebSocket for real-time updates
  useEffect(() => {
    if (!companyId) return
    const wsUrl = API_URL
      ? `${API_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/ws`
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`

    let ws
    try {
      ws = new WebSocket(wsUrl)
      ws.onmessage = () => {
        fetch(apiUrl(`/api/user/companies/${companyId}/agents/status`), {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(data => {
            if (data.agents) {
              setAgents(data.agents)
              setStats({
                totalActive: data.totalActive || 0,
                totalInProgress: data.totalInProgress || 0,
                totalQueued: data.totalQueued || 0,
              })
            }
          })
          .catch(() => {})
      }
    } catch (e) { /* ws optional */ }

    return () => { if (ws) ws.close() }
  }, [companyId, token])

  // Resize canvas to container
  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const w = Math.floor(rect.width)
        const h = Math.floor(Math.min(rect.height, w * 0.5625)) // 16:9
        setCanvasSize({ w: Math.max(400, w), h: Math.max(225, h) })
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (companies.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">🏢</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Tu oficina de agentes</h2>
          <p className="text-gray-400 text-sm">
            Crea tu primera empresa para ver a tus agentes trabajando.
          </p>
        </div>
      </div>
    )
  }

  const agentCount = Object.keys(agents).length
  const company = companies.find(c => c.id === companyId)
  const allIdle = Object.values(agents).every(a => a.state === 'idle')

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="text-base">🏢</span>
            Oficina de Agentes {company ? `— ${company.name}` : ''}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            {stats.totalInProgress > 0 ? `${stats.totalInProgress} trabajando` : `${agentCount} agentes`}
          </span>
        </div>

        {companies.length > 1 && (
          <select
            value={companyId || ''}
            onChange={(e) => setCompanyId(e.target.value)}
            className="text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Nudge when all agents are idle */}
      {allIdle && (
        <div className="mx-4 mt-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
          <span className="text-lg">💤</span>
          <div className="flex-1">
            <p className="text-sm text-amber-200">
              Tus agentes están descansando. Si quieres que se ganen el sueldo, habla con tu Co-Founder para crearles tareas.
            </p>
          </div>
          <a href="/" className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors whitespace-nowrap">
            Ir al Chat
          </a>
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Left: Office Canvas (60%) */}
        <div ref={containerRef} className="flex-1 lg:w-3/5 min-h-0 flex items-center justify-center">
          <OfficeCanvas
            agents={agents}
            width={canvasSize.w}
            height={canvasSize.h}
            companyName={company?.name}
          />
        </div>

        {/* Right: Agent Panel (40%) */}
        <div className="lg:w-2/5 overflow-y-auto min-h-0">
          <AgentPanel
            agents={agents}
            totalActive={stats.totalActive}
            totalInProgress={stats.totalInProgress}
          />
        </div>
      </div>
    </div>
  )
}
