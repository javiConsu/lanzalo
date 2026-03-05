# Lanzalo - AI Co-Founder Platform

**Autonomous AI that builds and runs your company 24/7**

## Business Model
- **Freemium**: $39/month for full autonomy
- **Revenue Share**: 20% of profits via Stripe
- **Open to all verticals**: SaaS, ecommerce, content, services

## MVP Features (Must-Have)
- ✅ Idea input → AI roadmap planning
- ✅ Auto-deploy web apps
- ✅ Live dashboard showing real-time progress
- ✅ Email automation (cold outreach, updates)
- ✅ Twitter automation
- ✅ Analytics & metrics

## Tech Stack
- **Frontend**: Next.js 14 + React + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Supabase)
- **AI**: OpenRouter (Claude Sonnet 4)
- **Hosting**: Vercel (frontend) + Railway (backend)
- **Deployment**: Custom subdomain per company
- **Payments**: Stripe

## Architecture

```
┌─────────────────┐
│   Dashboard     │ (Next.js - live updates, company cards)
│  lanzalo.com    │
└────────┬────────┘
         │
    ┌────▼─────┐
    │   API    │ (Express - handles agents, deployments)
    │ Server   │
    └────┬─────┘
         │
    ┌────▼─────────────────────────┐
    │   Agent Orchestrator         │
    │  (Daily cycles + on-demand)  │
    └──┬───┬───┬───┬───┬───────────┘
       │   │   │   │   │
       │   │   │   │   └──> Email Agent
       │   │   │   └──────> Twitter Agent
       │   │   └──────────> Code Agent
       │   └──────────────> Marketing Agent
       └──────────────────> Analytics Agent
```

## Project Structure
```
lanzalo/
├── frontend/          # Next.js dashboard
├── backend/           # Express API + agents
├── agents/            # Autonomous agent modules
├── deployer/          # Auto-deployment system
├── database/          # Schema & migrations
└── docs/              # Architecture & guides
```

## Timeline
**Week 1**: Core infrastructure + basic agent system
**Week 2**: Dashboard + deployment pipeline
**Week 3**: Email/Twitter automation + analytics
**Week 4**: Polish + first beta users

---

Built with urgency. Shipped with confidence.
