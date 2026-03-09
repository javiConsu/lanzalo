/**
 * AgentOffice — Oficina pixel-art de agentes en tiempo real
 * Inspirado en Star-Office-UI (ringhyacinth/Star-Office-UI)
 * Adaptado para Lánzalo: 7 agentes IA con sprites pixel-art, movimiento autónomo,
 * conversaciones entre ellos y comportamientos variados.
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

// ─── Autonomous behaviour system ───────────────────────────
const BEHAVIOURS = ['wander', 'sit_desk', 'coffee', 'chat', 'stretch', 'phone', 'window']

// Points of interest in the office (normalised 0-1 coords)
const POI = {
  desks: [
    { x: 0.12, y: 0.52 }, { x: 0.22, y: 0.52 },
    { x: 0.12, y: 0.67 }, { x: 0.22, y: 0.67 },
    { x: 0.32, y: 0.52 }, { x: 0.32, y: 0.67 },
  ],
  coffee: [
    { x: 0.60, y: 0.28 }, { x: 0.64, y: 0.32 },
  ],
  sofas: [
    { x: 0.44, y: 0.60 }, { x: 0.56, y: 0.60 },
    { x: 0.50, y: 0.68 },
  ],
  library: [
    { x: 0.38, y: 0.30 }, { x: 0.46, y: 0.30 },
    { x: 0.42, y: 0.40 },
  ],
  servers: [
    { x: 0.82, y: 0.30 }, { x: 0.88, y: 0.35 },
  ],
  windows: [
    { x: 0.75, y: 0.50 }, { x: 0.85, y: 0.55 },
  ],
  wander: [
    { x: 0.18, y: 0.45 }, { x: 0.30, y: 0.58 },
    { x: 0.40, y: 0.50 }, { x: 0.55, y: 0.45 },
    { x: 0.65, y: 0.55 }, { x: 0.75, y: 0.65 },
    { x: 0.50, y: 0.75 }, { x: 0.35, y: 0.72 },
    { x: 0.68, y: 0.42 }, { x: 0.25, y: 0.38 },
    { x: 0.82, y: 0.62 }, { x: 0.15, y: 0.78 },
    { x: 0.60, y: 0.70 }, { x: 0.45, y: 0.45 },
  ],
}

// Conversation lines when two agents meet
const CHAT_LINES = [
  ['¿Qué tal va eso?', 'Bien, avanzando poco a poco'],
  ['¿Café?', 'Venga, me apunto ☕'],
  ['Tengo una idea loca...', 'Cuenta, cuenta 👀'],
  ['El jefe no nos da tareas', '¡Mejor! Descanso merecido'],
  ['He visto los datos...', '¿Y? ¿Algo interesante?'],
  ['¿Sabes algo del deploy?', 'Dicen que pronto...'],
  ['Esto va a ser grande', 'Vamos a romperla 💪'],
  ['Necesito tu ayuda luego', 'Aquí estoy para lo que haga falta'],
  ['¿Has visto el roadmap?', 'Sí, hay curro para rato'],
  ['Menudo día, ¿no?', 'Y lo que queda...'],
  ['¿Quedamos en la cocina?', 'Sí, en 5 minutos'],
  ['El Co-Founder dice que...', '¿Qué dice ahora? 😅'],
  ['Estoy frito', 'Tómate un respiro, anda'],
  ['¿Alguna novedad?', 'Todo tranquilo por aquí'],
]

// Solo bubble texts
const SOLO_BUBBLES = {
  wander: [
    'Paseando por la ofi...',
    'Dando una vuelta',
    'Estirando las piernas',
    'A ver qué hacen los demás',
    'De paseo 🚶',
  ],
  sit_desk: [
    'Revisando cosillas...',
    'Echando un vistazo',
    'Organizando el escritorio',
    'Leyendo los últimos logs',
    'Mirando el email...',
  ],
  coffee: [
    'Café, café, café ☕',
    'Sin café no funciono',
    'El tercer café del día...',
    '¿Descafeinado? Ni en broma',
    'Cargando cafeína...',
  ],
  stretch: [
    'Estiramiento matutino 🧘',
    'Necesitaba moverme',
    'Un poco de yoga digital',
    'Recargando energías',
  ],
  phone: [
    'Mirando el móvil 📱',
    'Revisando notificaciones',
    'Un mensaje...',
    'Scrolleando un poco...',
  ],
  window: [
    'Mirando por la ventana 🪟',
    'Bonito día ahí fuera...',
    'Pensando en mis cosas',
    'Un momento zen',
  ],
  idle_default: [
    'Aquí, esperando órdenes jefe',
    'Cargando baterías...',
    'Zen mode: activado',
    'Nadie me ha dado tarea.',
    'Esto de no hacer nada cansa',
    'A ver si el jefe se decide...',
    'Listo para lo que haga falta',
    'Recargando pilas ⚡',
  ],
}

// Working state bubbles
const WORK_BUBBLES = {
  writing: [
    'No me molestes, estoy en racha',
    'Picando código a toda máquina',
    'Esto va a quedar fino...',
    'Escribiendo cosas importantes™',
    'Dame 5 minutos más...',
    'Concentrado nivel: monje budista',
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

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Agent Behaviour State Machine ─────────────────────────
function initAgentBehaviour(type, index) {
  const startPositions = [
    { x: 0.15, y: 0.55 }, { x: 0.25, y: 0.65 },
    { x: 0.40, y: 0.50 }, { x: 0.55, y: 0.60 },
    { x: 0.70, y: 0.45 }, { x: 0.35, y: 0.72 },
    { x: 0.80, y: 0.58 },
  ]
  const start = startPositions[index % startPositions.length]
  return {
    behaviour: 'wander',
    target: { x: start.x + (Math.random() - 0.5) * 0.05, y: start.y + (Math.random() - 0.5) * 0.05 },
    pos: { x: start.x, y: start.y },
    timer: Math.random() * 5 + 2,
    bubbleText: '',
    bubbleTimer: 0,
    bubbleAlpha: 0,
    chatPartner: null,
    chatLine: null,
    chatRole: null,
    speed: 0.02 + Math.random() * 0.015,
    facingLeft: Math.random() > 0.5,
    atTarget: false,
    waitTimer: 0,
  }
}

function chooseNextBehaviour(agentType) {
  const weights = {
    ceo:       { wander: 3, sit_desk: 1, coffee: 2, chat: 4, stretch: 1, phone: 1, window: 1 },
    code:      { wander: 1, sit_desk: 4, coffee: 2, chat: 2, stretch: 1, phone: 1, window: 1 },
    marketing: { wander: 2, sit_desk: 1, coffee: 3, chat: 4, stretch: 1, phone: 2, window: 1 },
    email:     { wander: 2, sit_desk: 3, coffee: 2, chat: 2, stretch: 1, phone: 3, window: 1 },
    research:  { wander: 2, sit_desk: 2, coffee: 1, chat: 2, stretch: 1, phone: 1, window: 3 },
    data:      { wander: 1, sit_desk: 4, coffee: 2, chat: 1, stretch: 1, phone: 1, window: 1 },
    twitter:   { wander: 3, sit_desk: 1, coffee: 2, chat: 3, stretch: 1, phone: 4, window: 1 },
  }
  const w = weights[agentType] || { wander: 2, sit_desk: 2, coffee: 2, chat: 2, stretch: 1, phone: 1, window: 1 }
  const entries = Object.entries(w)
  const totalWeight = entries.reduce((sum, [, v]) => sum + v, 0)
  let r = Math.random() * totalWeight
  for (const [behaviour, weight] of entries) {
    r -= weight
    if (r <= 0) return behaviour
  }
  return 'wander'
}

function getTargetForBehaviour(behaviour) {
  switch (behaviour) {
    case 'sit_desk': return pick(POI.desks)
    case 'coffee': return pick(POI.coffee)
    case 'chat': return pick(POI.sofas)
    case 'stretch': return pick(POI.wander)
    case 'phone': return pick(POI.sofas)
    case 'window': return pick(POI.windows)
    case 'wander':
    default: return pick(POI.wander)
  }
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

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// ─── Pixel Art Canvas Component ────────────────────────────
function OfficeCanvas({ agents, width, height, companyName }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const bgImageRef = useRef(null)
  const spriteImgsRef = useRef({})
  const timeRef = useRef(0)
  const behaviourRef = useRef({})

  // Load background
  useEffect(() => {
    const img = new Image()
    img.src = '/office-assets/office_bg_lanzalo.png'
    img.onload = () => { bgImageRef.current = img }
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

  // Initialize behaviours
  useEffect(() => {
    const agentKeys = Object.keys(agents)
    agentKeys.forEach((type, i) => {
      if (!behaviourRef.current[type]) {
        behaviourRef.current[type] = initAgentBehaviour(type, i)
      }
    })
  }, [agents])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const agentKeys = Object.keys(agents)

    let lastTime = performance.now()

    const draw = (timestamp) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.06)
      lastTime = timestamp
      timeRef.current = timestamp / 1000
      const t = timeRef.current

      ctx.clearRect(0, 0, width, height)

      // Draw background
      if (bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, width, height)
        ctx.fillStyle = 'rgba(0, 0, 10, 0.10)'
        ctx.fillRect(0, 0, width, height)
      } else {
        const grad = ctx.createRadialGradient(width * 0.5, height * 0.4, 50, width * 0.5, height * 0.5, width * 0.7)
        grad.addColorStop(0, '#2a2540')
        grad.addColorStop(1, '#151020')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, width, height)
      }

      // ─── Update behaviours ───────────────────────
      agentKeys.forEach((type) => {
        const agent = agents[type]
        const bh = behaviourRef.current[type]
        if (!bh) return

        const isWorking = agent.state && agent.state !== 'idle'

        if (isWorking) {
          // Working → go to work area
          const stateInfo = STATE_INFO[agent.state] || STATE_INFO.idle
          const area = stateInfo.area
          const workTargets = area === 'desk' ? POI.desks
            : area === 'library' ? POI.library
            : area === 'server' ? POI.servers
            : POI.desks
          const idx = type.charCodeAt(0) % workTargets.length
          bh.target = { ...workTargets[idx] }
          bh.behaviour = 'working'
          bh.chatPartner = null
          bh.chatLine = null

          bh.bubbleTimer -= dt
          if (bh.bubbleTimer <= 0) {
            const bubbles = WORK_BUBBLES[agent.state] || WORK_BUBBLES.executing
            bh.bubbleText = pick(bubbles)
            bh.bubbleTimer = 6 + Math.random() * 6
            bh.bubbleAlpha = 1
          }
        } else {
          // ── Idle behaviour state machine ──────────
          bh.timer -= dt

          const d = dist(bh.pos, bh.target)
          if (d < 0.02) {
            if (!bh.atTarget) {
              bh.atTarget = true
              bh.waitTimer = 3 + Math.random() * 5
              const bubblePool = SOLO_BUBBLES[bh.behaviour] || SOLO_BUBBLES.idle_default
              bh.bubbleText = pick(bubblePool)
              bh.bubbleTimer = bh.waitTimer
              bh.bubbleAlpha = 1
            }
            bh.waitTimer -= dt
          }

          if (bh.timer <= 0 || (bh.atTarget && bh.waitTimer <= 0)) {
            const nextBehaviour = chooseNextBehaviour(type)
            bh.behaviour = nextBehaviour
            bh.atTarget = false
            bh.waitTimer = 0

            if (nextBehaviour === 'chat') {
              const candidates = agentKeys.filter(k => {
                if (k === type) return false
                const otherAgent = agents[k]
                const otherBh = behaviourRef.current[k]
                if (!otherBh) return false
                if (otherAgent.state && otherAgent.state !== 'idle') return false
                if (otherBh.chatPartner) return false
                return true
              })
              if (candidates.length > 0) {
                const partner = pick(candidates)
                const chatPair = pick(CHAT_LINES)
                const meetPoint = pick(POI.sofas)
                bh.target = { x: meetPoint.x - 0.04, y: meetPoint.y }
                bh.chatPartner = partner
                bh.chatLine = chatPair[0]
                bh.chatRole = 'initiator'
                bh.timer = 8 + Math.random() * 4

                const partnerBh = behaviourRef.current[partner]
                if (partnerBh) {
                  partnerBh.behaviour = 'chat'
                  partnerBh.target = { x: meetPoint.x + 0.04, y: meetPoint.y }
                  partnerBh.chatPartner = type
                  partnerBh.chatLine = chatPair[1]
                  partnerBh.chatRole = 'responder'
                  partnerBh.timer = 8 + Math.random() * 4
                  partnerBh.atTarget = false
                  partnerBh.waitTimer = 0
                  partnerBh.bubbleAlpha = 0
                }
              } else {
                bh.behaviour = 'wander'
                bh.target = getTargetForBehaviour('wander')
                bh.timer = 4 + Math.random() * 5
              }
            } else {
              bh.target = getTargetForBehaviour(nextBehaviour)
              bh.timer = 5 + Math.random() * 8
              bh.chatPartner = null
              bh.chatLine = null
            }

            bh.bubbleAlpha = 0
            bh.bubbleTimer = 1.5 + Math.random() * 2
          }

          // Solo bubble cycling
          if (!bh.chatPartner) {
            bh.bubbleTimer -= dt
            if (bh.bubbleTimer <= 0 && bh.bubbleAlpha <= 0) {
              const bubblePool = SOLO_BUBBLES[bh.behaviour] || SOLO_BUBBLES.idle_default
              bh.bubbleText = pick(bubblePool)
              bh.bubbleTimer = 7 + Math.random() * 5
              bh.bubbleAlpha = 1
            }
          }

          // Chat bubbles
          if (bh.chatPartner && bh.atTarget) {
            const partnerBh = behaviourRef.current[bh.chatPartner]
            if (partnerBh && partnerBh.atTarget) {
              if (bh.bubbleAlpha <= 0) {
                const cycleTime = (t * 0.5) % 2
                if (bh.chatRole === 'initiator' && cycleTime < 1) {
                  bh.bubbleText = bh.chatLine
                  bh.bubbleAlpha = 1
                  bh.bubbleTimer = 3
                } else if (bh.chatRole === 'responder' && cycleTime >= 1) {
                  bh.bubbleText = bh.chatLine
                  bh.bubbleAlpha = 1
                  bh.bubbleTimer = 3
                }
              }
            }
          }
        }

        // ── Movement ─────────────────────────────────
        const targetX = bh.target.x
        const targetY = bh.target.y
        const d2 = dist(bh.pos, { x: targetX, y: targetY })

        if (d2 > 0.015) {
          const moveSpeed = bh.behaviour === 'wander' ? bh.speed * 0.7 : bh.speed
          const step = Math.min(moveSpeed * dt, d2)
          const dx = (targetX - bh.pos.x) / d2 * step
          const dy = (targetY - bh.pos.y) / d2 * step
          bh.pos.x = clamp(bh.pos.x + dx, 0.05, 0.95)
          bh.pos.y = clamp(bh.pos.y + dy, 0.20, 0.85)
          bh.facingLeft = dx < -0.001
          bh.atTarget = false
        }

        // Fade out bubble
        if (bh.bubbleAlpha > 0 && bh.bubbleTimer > 0) {
          bh.bubbleTimer -= dt
          if (bh.bubbleTimer <= 0.5) {
            bh.bubbleAlpha = Math.max(0, bh.bubbleTimer / 0.5)
          }
        } else if (bh.bubbleTimer <= 0) {
          bh.bubbleAlpha = Math.max(0, bh.bubbleAlpha - dt * 2)
        }
      })

      // ─── Sort by Y for depth ────────────────────
      const sortedAgents = [...agentKeys].sort((a, b) => {
        const bhA = behaviourRef.current[a]
        const bhB = behaviourRef.current[b]
        return (bhA?.pos.y || 0) - (bhB?.pos.y || 0)
      })

      // ─── Draw each agent ────────────────────────
      sortedAgents.forEach((type, sortIdx) => {
        const agent = agents[type]
        const bh = behaviourRef.current[type]
        if (!bh) return

        const agentColor = AGENT_DEFS[type]?.color || '#888'
        const isWorking = agent.state && agent.state !== 'idle'

        const px = bh.pos.x * width
        const py = bh.pos.y * height

        const d = dist(bh.pos, bh.target)
        const isMoving = d > 0.02
        const bobAmt = isMoving ? Math.sin(t * 8 + sortIdx * 2) * 3 : Math.sin(t * 1.5 + sortIdx * 1.1) * 1.5
        const x = px
        const y = py + bobAmt

        // Sprite size
        const spriteScale = Math.min(width, height) / 6
        const spriteSize = Math.max(80, Math.min(spriteScale, 150))

        // Shadow
        ctx.save()
        ctx.beginPath()
        const shadowScale = isMoving ? 0.3 : 0.35
        ctx.ellipse(x, y + spriteSize * 0.45, spriteSize * shadowScale, spriteSize * 0.08, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.30)'
        ctx.fill()
        ctx.restore()

        // Active glow (working)
        if (isWorking) {
          ctx.save()
          const glowPulse = 0.35 + Math.sin(t * 3 + sortIdx) * 0.15
          const grd = ctx.createRadialGradient(x, y, spriteSize * 0.2, x, y, spriteSize * 0.9)
          grd.addColorStop(0, agentColor + Math.round(glowPulse * 255).toString(16).padStart(2, '0'))
          grd.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = grd
          ctx.beginPath()
          ctx.arc(x, y, spriteSize * 0.9, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        // Chat glow
        if (bh.chatPartner && bh.atTarget) {
          ctx.save()
          const chatGlow = 0.15 + Math.sin(t * 2) * 0.08
          const grd = ctx.createRadialGradient(x, y, spriteSize * 0.3, x, y, spriteSize * 0.7)
          grd.addColorStop(0, '#fbbf24' + Math.round(chatGlow * 255).toString(16).padStart(2, '0'))
          grd.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = grd
          ctx.beginPath()
          ctx.arc(x, y, spriteSize * 0.7, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        // Draw sprite
        const spriteImg = spriteImgsRef.current[type]
        if (spriteImg) {
          ctx.save()
          ctx.imageSmoothingEnabled = false
          if (bh.facingLeft) {
            ctx.translate(x, y - spriteSize * 0.1)
            ctx.scale(-1, 1)
            ctx.drawImage(spriteImg, -spriteSize * 0.5, -spriteSize * 0.4, spriteSize, spriteSize)
          } else {
            ctx.drawImage(spriteImg, x - spriteSize * 0.5, y - spriteSize * 0.5, spriteSize, spriteSize)
          }
          ctx.imageSmoothingEnabled = true
          ctx.restore()
        } else {
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

        // Walking dust puffs
        if (isMoving) {
          const puffPhase = (t * 6 + sortIdx * 3) % 1
          if (puffPhase < 0.3) {
            ctx.save()
            ctx.globalAlpha = (1 - puffPhase / 0.3) * 0.3
            const puffX = x + (bh.facingLeft ? spriteSize * 0.3 : -spriteSize * 0.3)
            const puffY = y + spriteSize * 0.4
            ctx.fillStyle = 'rgba(200, 200, 200, 0.4)'
            ctx.beginPath()
            ctx.arc(puffX, puffY, 2 + puffPhase * 4, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
          }
        }

        // Name label
        const fontSize = Math.max(9, spriteSize * 0.16)
        ctx.font = `bold ${fontSize}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        const nameText = AGENT_DEFS[type]?.name || type
        const nameMetrics = ctx.measureText(nameText)
        const nameW = nameMetrics.width + 10
        const nameH = 16
        const nameY = y + spriteSize * 0.42

        ctx.fillStyle = 'rgba(10, 10, 25, 0.80)'
        roundRect(ctx, x - nameW / 2, nameY, nameW, nameH, 4)
        ctx.fill()
        ctx.strokeStyle = agentColor + '60'
        ctx.lineWidth = 0.5
        roundRect(ctx, x - nameW / 2, nameY, nameW, nameH, 4)
        ctx.stroke()
        ctx.fillStyle = '#e2e8f0'
        ctx.fillText(nameText, x, nameY + 2)

        // State icon badge (working)
        if (isWorking) {
          const stateInfo = STATE_INFO[agent.state] || STATE_INFO.idle
          const badgeX = x + spriteSize * 0.35
          const badgeY = y - spriteSize * 0.4
          ctx.font = `${Math.max(12, spriteSize * 0.22)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(stateInfo.icon, badgeX, badgeY)
        }

        // Behaviour icon (idle, at target, not chatting)
        if (!isWorking && bh.atTarget && !bh.chatPartner) {
          const icons = { coffee: '☕', phone: '📱', window: '🪟', sit_desk: '💻', stretch: '🧘' }
          const icon = icons[bh.behaviour]
          if (icon) {
            ctx.save()
            ctx.globalAlpha = 0.7
            ctx.font = `${Math.max(10, spriteSize * 0.18)}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(icon, x + spriteSize * 0.32, y - spriteSize * 0.38)
            ctx.restore()
          }
        }

        // Speech bubble
        if (bh.bubbleText && bh.bubbleAlpha > 0.01) {
          ctx.save()
          ctx.globalAlpha = bh.bubbleAlpha * 0.92

          const bubbleFontSize = Math.max(9, spriteSize * 0.14)
          ctx.font = `${bubbleFontSize}px monospace`
          ctx.textAlign = 'center'
          const tw = ctx.measureText(bh.bubbleText).width + 16
          const bx = x
          const by = y - spriteSize * 0.60
          const bh2 = 22

          const bubbleBorderColor = bh.chatPartner ? '#fbbf24' : agentColor
          roundRect(ctx, bx - tw / 2, by - bh2 + 2, tw, bh2, 6)
          ctx.fillStyle = 'rgba(12, 12, 28, 0.92)'
          ctx.fill()
          ctx.strokeStyle = bubbleBorderColor + '60'
          ctx.lineWidth = 1
          roundRect(ctx, bx - tw / 2, by - bh2 + 2, tw, bh2, 6)
          ctx.stroke()

          // Tail
          ctx.fillStyle = 'rgba(12, 12, 28, 0.92)'
          ctx.beginPath()
          ctx.moveTo(bx - 4, by + 4)
          ctx.lineTo(bx, by + 10)
          ctx.lineTo(bx + 4, by + 4)
          ctx.fill()

          // Text
          ctx.textBaseline = 'middle'
          ctx.fillStyle = bh.chatPartner ? '#fde68a' : '#cbd5e1'
          ctx.fillText(bh.bubbleText, bx, by - bh2 / 2 + 2)
          ctx.restore()
        }
      })

      // Bottom plaque
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
  }, [agents, width, height, companyName])

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
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [companyId, token])

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

  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const w = Math.floor(rect.width)
        const h = Math.floor(Math.min(rect.height, w * 0.5625))
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

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        <div ref={containerRef} className="flex-1 lg:w-3/5 min-h-0 flex items-center justify-center">
          <OfficeCanvas
            agents={agents}
            width={canvasSize.w}
            height={canvasSize.h}
            companyName={company?.name}
          />
        </div>

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
