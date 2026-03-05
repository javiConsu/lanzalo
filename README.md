# Lanzalo - Plataforma de Co-Fundador IA

**IA autónoma que construye y maneja tu empresa 24/7**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-14%2B-blue)](https://www.postgresql.org/)

## ¿Qué es Lanzalo?

Lanzalo es una plataforma que permite a cualquier persona crear y lanzar empresas autónomas impulsadas por IA. Los agentes trabajan 24/7 para:

- 💻 Escribir y desplegar código
- 📧 Realizar outreach frío por email
- 🐦 Gestionar presencia en redes sociales
- 📊 Analizar métricas y tomar decisiones
- 🚀 Mejorar el producto continuamente

## Modelo de Negocio

- **Freemium**: $39/mes por autonomía completa
- **Revenue Share**: 20% de las ganancias vía Stripe
- **Abierto a todos los verticales**: SaaS, ecommerce, contenido, servicios

## Características MVP

- ✅ Input de idea → roadmap planificado por IA
- ✅ Auto-despliegue de aplicaciones web
- ✅ Dashboard en vivo mostrando progreso en tiempo real
- ✅ Automatización de emails (cold outreach, actualizaciones)
- ✅ Automatización de Twitter
- ✅ Analytics y métricas
- ✅ Sistema de quotas y control de costos
- ✅ Sandbox de ejecución seguro
- ✅ Multi-tenancy con aislamiento completo

## Tech Stack

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
    │ Server   │
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

## Instalación

Ver [INSTALL.md](./INSTALL.md) para instrucciones detalladas.

### Quick Start

```bash
git clone https://github.com/tu-usuario/lanzalo.git
cd lanzalo
chmod +x setup.sh
./setup.sh
npm run dev
```

## Uso

### Crear una Empresa

```bash
curl -X POST http://localhost:3001/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "name": "MiStartup",
    "description": "Una plataforma SaaS para gestión de proyectos",
    "industry": "SaaS"
  }'
```

### Ejecutar un Agente

```bash
curl -X POST http://localhost:3001/api/tasks/run \
  -H "Content-Type: application/json" \
  -H "x-company-id: <company-id>" \
  -d '{
    "agent_type": "code",
    "description": "Crear landing page con hero section"
  }'
```

### Ver Dashboard

Abre `http://localhost:3000` para ver el dashboard en vivo con:
- Actividad en tiempo real
- Empresas activas
- Métricas y analytics

## Seguridad

- ✅ **Multi-tenancy**: Aislamiento completo entre empresas
- ✅ **Sandbox**: Ejecución segura de código con VM2
- ✅ **Quotas**: Límites por plan para prevenir abuso
- ✅ **Cost Tracking**: Seguimiento de costos LLM por empresa
- ✅ **Rate Limiting**: Control de frecuencia de requests

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para detalles técnicos.

## Contribuir

¡Contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Roadmap

- [x] Sistema de agentes autónomos
- [x] Multi-tenancy y quotas
- [x] Sandbox de ejecución seguro
- [x] Sistema de deployment
- [x] Dashboard en tiempo real
- [ ] Stripe Connect (revenue share)
- [ ] Autenticación de usuarios
- [ ] Mobile app
- [ ] Integraciones (Zapier, Slack)
- [ ] Soporte multi-idioma

## Licencia

MIT License - ver [LICENSE](./LICENSE) para detalles.

## Soporte

- 📧 Email: soporte@lanzalo.app
- 💬 Discord: [Únete a la comunidad](https://discord.gg/lanzalo)
- 📚 Docs: [docs.lanzalo.app](https://docs.lanzalo.app)

---

**Construido con urgencia. Lanzado con confianza.**

Hecho con ❤️ por el equipo de Lanzalo
