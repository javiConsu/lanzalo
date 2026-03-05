# Lanzalo - Plataforma de Co-Fundador IA

**IA autónoma que construye y maneja tu empresa 24/7**

## Modelo de Negocio
- **Freemium**: $39/mes por autonomía completa
- **Reparto de Ingresos**: 20% de las ganancias vía Stripe
- **Abierto a todos los verticales**: SaaS, ecommerce, contenido, servicios

## Características MVP (Imprescindibles)
- ✅ Input de idea → roadmap planificado por IA
- ✅ Auto-despliegue de aplicaciones web
- ✅ Dashboard en vivo mostrando progreso en tiempo real
- ✅ Automatización de emails (outreach frío, actualizaciones)
- ✅ Automatización de Twitter
- ✅ Analytics y métricas

## Stack Tecnológico
- **Frontend**: Next.js 14 + React + Tailwind CSS
- **Backend**: Node.js + Express
- **Base de Datos**: PostgreSQL (Supabase)
- **IA**: OpenRouter (Claude Sonnet 4)
- **Hosting**: Vercel (frontend) + Railway (backend)
- **Despliegue**: Subdominio personalizado por empresa
- **Pagos**: Stripe

## Arquitectura

```
┌─────────────────┐
│   Dashboard     │ (Next.js - actualizaciones en vivo, tarjetas de empresas)
│  lanzalo.com    │
└────────┬────────┘
         │
    ┌────▼─────┐
    │   API    │ (Express - maneja agentes, despliegues)
    │  Server  │
    └────┬─────┘
         │
    ┌────▼─────────────────────────┐
    │   Orquestador de Agentes     │
    │  (Ciclos diarios + on-demand)│
    └──┬───┬───┬───┬───┬───────────┘
       │   │   │   │   │
       │   │   │   │   └──> Agente de Email
       │   │   │   └──────> Agente de Twitter
       │   │   └──────────> Agente de Código
       │   └──────────────> Agente de Marketing
       └──────────────────> Agente de Analytics
```

## Estructura del Proyecto
```
lanzalo/
├── frontend/          # Dashboard Next.js
├── backend/           # API Express + agentes
├── agents/            # Módulos de agentes autónomos
├── deployer/          # Sistema de auto-despliegue
├── database/          # Schema y migraciones
└── docs/              # Arquitectura y guías
```

## Timeline
**Semana 1**: Infraestructura core + sistema básico de agentes
**Semana 2**: Características MVP
**Semana 3**: Pulido y preparación para lanzamiento
**Semana 4**: Lanzamiento beta

---

Construido con urgencia. Lanzado con confianza.
