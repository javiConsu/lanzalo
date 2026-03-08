/**
 * AgentOffice — Oficina pixel-art de agentes en tiempo real
 * Inspirado en Star-Office-UI (ringhyacinth/Star-Office-UI)
 * Adaptado para Lánzalo: 7 agentes IA con estados en vivo
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { apiUrl, API_URL } from '../api.js'

// ─── Agent definitions ─────────────────────────────────────
const AGENT_DEFS = {
  ceo:       { name: 'CEO',       emoji: '🧠', color: '#10b981', role: 'Coordina todo' },
  code:      { name: 'Code',      emoji: '💻', color: '#3b82f6', role: 'Escribe código' },
  marketing: { name: 'Marketing', emoji: '📣', color: '#ec4899', role: 'Estrategia y contenido' },
  email:     { name: 'Email',     emoji: '📧', color: '#f59e0b', role: 'Cold outreach' },
  research:  { name: 'Research',  emoji: '🔍', color: '#8b5cf6', role: 'Investigación de mercado' },
  data:      { name: 'Data',      emoji: '📊', color: '#06b6d4', role: 'Análisis y métricas' },
  twitter:   { name: 'Twitter',   emoji: '🐦', color: '#6366f1', role: 'Redes sociales' },
}

// State → Spanish label + area
const STATE_INFO = {
  idle:        { label: 'Descansando', area: 'breakroom', icon: '💤' },
  writing:     { label: 'Escribiendo', area: 'desk', icon: '✍️' },
  researching: { label: 'Investigando', area: 'library', icon: '🔎' },
  executing:   { label: 'Ejecutando', area: 'desk', icon: '⚡' },
  syncing:     { label: 'Sincronizando', area: 'server', icon: '🔄' },
  error:       { label: 'Error', area: 'bug', icon: '🐛' },
}

// Bubble texts por estado (personalidad Lánzalo)
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
    'Picando código como si no hubiera mañana',
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

// ─── Pixel Art Canvas Component ────────────────────────────
function OfficeCanvas({ agents, width, height }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const bgImageRef = useRef(null)
  const timeRef = useRef(0)
  const bubblesRef = useRef({})

  // Positions in the office for each area (normalized 0-1)
  const AREA_POSITIONS = {
    breakroom: [
      { x: 0.50, y: 0.45 },
      { x: 0.55, y: 0.50 },
      { x: 0.45, y: 0.55 },
      { x: 0.60, y: 0.45 },
    ],
    desk: [
      { x: 0.18, y: 0.48 },
      { x: 0.28, y: 0.48 },
      { x: 0.18, y: 0.58 },
      { x: 0.28, y: 0.58 },
    ],
    library: [
      { x: 0.38, y: 0.25 },
      { x: 0.48, y: 0.25 },
      { x: 0.33, y: 0.30 },
    ],
    server: [
      { x: 0.82, y: 0.25 },
      { x: 0.88, y: 0.30 },
    ],
    bug: [
      { x: 0.80, y: 0.45 },
      { x: 0.85, y: 0.50 },
    ],
  }

  // Assign positions to agents
  const getAgentPosition = useCallback((agent, index) => {
    const stateInfo = STATE_INFO[agent.state] || STATE_INFO.idle
    const area = stateInfo.area
    const positions = AREA_POSITIONS[area] || AREA_POSITIONS.breakroom
    const pos = positions[index % positions.length]
    return { x: pos.x * width, y: pos.y * height }
  }, [width, height])

  // Load background
  useEffect(() => {
    const img = new Image()
    img.src = '/office-assets/office_bg.webp'
    img.onload = () => { bgImageRef.current = img }
  }, [])

  // Initialize bubbles
  useEffect(() => {
    const agentList = Object.entries(agents)
    agentList.forEach(([type, agent]) => {
      if (!bubblesRef.current[type] || bubblesRef.current[type].state !== agent.state) {
        bubblesRef.current[type] = {
          text: getRandomBubble(agent.state),
          state: agent.state,
          timer: 0,
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
    // Group agents by area
    const areaCounters = {}

    const draw = (timestamp) => {
      timeRef.current = timestamp || 0
      const t = timeRef.current / 1000

      // Clear
      ctx.clearRect(0, 0, width, height)

      // Draw background
      if (bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, width, height)
      } else {
        // Fallback gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height)
        grad.addColorStop(0, '#1a1a2e')
        grad.addColorStop(1, '#16213e')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, width, height)

        // Draw pixel grid pattern
        ctx.fillStyle = 'rgba(255,255,255,0.02)'
        for (let x = 0; x < width; x += 16) {
          for (let y = 0; y < height; y += 16) {
            if ((x + y) % 32 === 0) ctx.fillRect(x, y, 16, 16)
          }
        }
      }

      // Draw area labels
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'

      const areaLabels = [
        { label: '🖥️ Escritorios', x: 0.22, y: 0.38 },
        { label: '📚 Biblioteca', x: 0.42, y: 0.17 },
        { label: '☕ Descanso', x: 0.52, y: 0.37 },
        { label: '🖧 Servidores', x: 0.85, y: 0.17 },
        { label: '🐛 Debug Zone', x: 0.82, y: 0.37 },
      ]

      areaLabels.forEach(({ label, x, y }) => {
        const px = x * width
        const py = y * height
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        const w = ctx.measureText(label).width + 12
        ctx.fillRect(px - w / 2, py - 8, w, 18)
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.fillText(label, px, py + 4)
      })

      // Reset area counters
      Object.keys(areaCounters).forEach(k => { areaCounters[k] = 0 })

      // Draw agents
      agentList.forEach(([type, agent], i) => {
        const stateInfo = STATE_INFO[agent.state] || STATE_INFO.idle
        const area = stateInfo.area
        if (!areaCounters[area]) areaCounters[area] = 0
        const areaIndex = areaCounters[area]++

        const positions = AREA_POSITIONS[area] || AREA_POSITIONS.breakroom
        const pos = positions[areaIndex % positions.length]
        const baseX = pos.x * width
        const baseY = pos.y * height

        // Subtle floating animation
        const floatY = Math.sin(t * 1.5 + i * 0.7) * 3
        const x = baseX
        const y = baseY + floatY

        // Agent circle body
        const radius = 20
        const agentColor = AGENT_DEFS[type]?.color || '#888'

        // Shadow
        ctx.beginPath()
        ctx.ellipse(x, y + radius + 4, radius * 0.8, 4, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.3)'
        ctx.fill()

        // Body glow for active states
        if (agent.state !== 'idle') {
          ctx.beginPath()
          ctx.arc(x, y, radius + 6, 0, Math.PI * 2)
          const glowAlpha = 0.15 + Math.sin(t * 3 + i) * 0.1
          ctx.fillStyle = agentColor + Math.round(glowAlpha * 255).toString(16).padStart(2, '0')
          ctx.fill()
        }

        // Body circle
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        const bodyGrad = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, radius)
        bodyGrad.addColorStop(0, lightenColor(agentColor, 30))
        bodyGrad.addColorStop(1, agentColor)
        ctx.fillStyle = bodyGrad
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Emoji face
        ctx.font = '18px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(AGENT_DEFS[type]?.emoji || '🤖', x, y)

        // Name label below
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        const nameText = AGENT_DEFS[type]?.name || type
        const nameW = ctx.measureText(nameText).width + 8
        ctx.fillRect(x - nameW / 2, y + radius + 6, nameW, 14)
        ctx.fillStyle = '#fff'
        ctx.fillText(nameText, x, y + radius + 8)

        // State icon above
        const stateIcon = stateInfo.icon
        ctx.font = '14px sans-serif'
        ctx.textBaseline = 'bottom'
        ctx.fillText(stateIcon, x + radius - 2, y - radius + 4)

        // Speech bubble (rotate every ~8 seconds)
        const bubble = bubblesRef.current[type]
        if (bubble) {
          bubble.timer += 0.016
          if (bubble.timer > 8) {
            bubble.text = getRandomBubble(agent.state)
            bubble.timer = 0
            bubble.showBubble = true
          }

          // Fade in/out
          const bubbleAlpha = bubble.timer < 0.5
            ? bubble.timer / 0.5
            : bubble.timer > 7
              ? 1 - (bubble.timer - 7)
              : 1

          if (bubbleAlpha > 0 && bubble.showBubble) {
            ctx.globalAlpha = bubbleAlpha * 0.95
            ctx.font = '10px monospace'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'
            const bubbleText = bubble.text
            const tw = ctx.measureText(bubbleText).width + 16
            const bx = x
            const by = y - radius - 16

            // Bubble background
            ctx.fillStyle = 'rgba(15, 15, 30, 0.9)'
            roundRect(ctx, bx - tw / 2, by - 18, tw, 22, 6)
            ctx.fill()
            ctx.strokeStyle = agentColor + '60'
            ctx.lineWidth = 1
            roundRect(ctx, bx - tw / 2, by - 18, tw, 22, 6)
            ctx.stroke()

            // Bubble tail
            ctx.fillStyle = 'rgba(15, 15, 30, 0.9)'
            ctx.beginPath()
            ctx.moveTo(bx - 4, by + 4)
            ctx.lineTo(bx, by + 10)
            ctx.lineTo(bx + 4, by + 4)
            ctx.fill()

            // Bubble text
            ctx.fillStyle = '#e2e8f0'
            ctx.fillText(bubbleText, bx, by)
            ctx.globalAlpha = 1
          }
        }
      })

      // Bottom plaque
      const plaqueW = 320
      const plaqueH = 32
      const plaqueX = (width - plaqueW) / 2
      const plaqueY = height - plaqueH - 8
      ctx.fillStyle = 'rgba(20, 20, 40, 0.85)'
      roundRect(ctx, plaqueX, plaqueY, plaqueW, plaqueH, 8)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)'
      ctx.lineWidth = 1
      roundRect(ctx, plaqueX, plaqueY, plaqueW, plaqueH, 8)
      ctx.stroke()
      ctx.font = '12px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fbbf24'
      ctx.fillText('⭐', plaqueX + 16, plaqueY + plaqueH / 2)
      ctx.fillText('⭐', plaqueX + plaqueW - 16, plaqueY + plaqueH / 2)
      ctx.fillStyle = '#e2e8f0'
      ctx.fillText('Oficina de Agentes — Lánzalo', width / 2, plaqueY + plaqueH / 2)

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [agents, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full h-full rounded-2xl"
      style={{ imageRendering: 'auto' }}
    />
  )
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

function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + percent)
  const g = Math.min(255, ((num >> 8) & 0x00FF) + percent)
  const b = Math.min(255, (num & 0x0000FF) + percent)
  return `rgb(${r},${g},${b})`
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
                  {/* Agent avatar */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${
                      isError ? 'bg-red-500/20' : isActive ? 'bg-emerald-500/20' : 'bg-gray-800'
                    }`}
                    style={isActive && !isError ? { boxShadow: `0 0 8px ${def.color}40` } : {}}
                  >
                    {def.emoji}
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
  const DEFAULT_AGENTS = Object.fromEntries(
    Object.entries(AGENT_DEFS).map(([type, def]) => [type, {
      ...def, type, state: 'idle', detail: 'Descansando...', tasksInProgress: 0, tasksQueued: 0
    }])
  )
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

  // Fetch agent statuses
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
        .catch(() => {})
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 5000) // Poll every 5s
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
        // Any activity → re-fetch agent status
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
        const h = Math.floor(Math.min(rect.height, w * 0.5625)) // 16:9 max
        setCanvasSize({ w, h })
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="text-base">🏢</span>
            Oficina de Agentes
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

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Left: Office Canvas (60%) */}
        <div ref={containerRef} className="flex-1 lg:w-3/5 min-h-0 flex items-center justify-center">
          {agentCount > 0 ? (
            <OfficeCanvas
              agents={agents}
              width={canvasSize.w}
              height={canvasSize.h}
            />
          ) : (
            <div className="text-gray-500 text-sm">Cargando agentes...</div>
          )}
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
