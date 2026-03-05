# Cost Analysis - Lanzalo

## 💰 Revenue Streams

### 1. MRR (Monthly Recurring Revenue)
```
Price: $39/mes per Pro user
Free users: $0
```

**Assumptions**:
- Average churn: 20%/month (typical SaaS)
- Average lifetime: 6 months
- LTV per user: $234 ($39 × 6)

### 2. Revenue Share (20%)
```
Commission: 20% of customer's business revenue
```

**Assumptions**:
- Average customer revenue: $500/mes
- Our share: $100/mes per successful business
- Only ~10% of users reach revenue stage
- Effective contribution: $10/user/mes

### 3. Meta Ads Commission (15%)
```
Commission: 15% of ad spend managed
```

**Assumptions**:
- Average ad spend: $300/user/mes
- Our commission: $45/user/mes
- ~80% of Pro users run ads
- Effective contribution: $36/user/mes

**Total Revenue Per Pro User**: $39 + $10 + $36 = **$85/mes**

---

## 💸 Cost Breakdown

### 1. LLM Costs (OpenRouter)

**Models Used**:
- Claude Sonnet 4: $3/M input, $15/M output (complex tasks)
- Claude Haiku: $0.25/M input, $1.25/M output (simple tasks)

**Usage Estimation**:
| Task Type | Monthly Tokens | Model | Cost/User/Month |
|-----------|----------------|-------|-----------------|
| CEO Chat | 500K | Sonnet | $7.50 |
| Code Gen | 1M | Sonnet | $15.00 |
| Research | 300K | Sonnet | $4.50 |
| Emails | 100K | Haiku | $0.15 |
| Tweets | 50K | Haiku | $0.08 |
| Data Analysis | 200K | Sonnet | $3.00 |
| **Total** | **2.15M** | **Mixed** | **~$30/user/mes** |

**Cost per user**: ~$30/mes  
**Profit margin after LLM**: $55/user/mes

### 2. Resend (Email Delivery)

**Pricing**:
- Pro plan: $20/mes for 50,000 emails
- Cost per email: $0.0004
- Overage: $0.90 per 1,000 emails

**Usage Estimation**:
| Email Type | Per User/Month | Cost |
|------------|----------------|------|
| Cold outreach | 200 emails | $0.08 |
| Follow-ups | 100 emails | $0.04 |
| Newsletters | 400 emails | $0.16 |
| Transactional | 300 emails | $0.12 |
| **Total** | **1,000 emails** | **$0.40/user/mes** |

**Cost per user**: $0.40/mes  
**Negligible impact on margin**

### 3. Sora Video Generation (Meta Ads)

**Pricing** (OpenAI API):
- 720p: $0.10/second
- 1080p: $0.50/second
- Average: 30s videos at 1080p = **$15/video**

**Usage Estimation**:
| Scenario | Videos/User/Month | Cost/User/Month |
|----------|-------------------|-----------------|
| Conservative | 5 videos | $75 |
| Realistic | 10 videos | $150 |
| Heavy | 20 videos | $300 |

**⚠️ RISK**: This is the **highest cost** driver.

**Options to Reduce**:
1. **Use Sora via ChatGPT Pro** ($200/mes for 10K credits):
   - ~500 videos/month at 480p
   - Cost: $200/mes for all users (amortized)
   - **Recommended**: Start with this

2. **Third-party APIs** (API-yi, Kie.ai):
   - $0.12-0.13/generation
   - 30s video: ~$3-4 instead of $15
   - **Saves 75%** on video costs

3. **Static templates first**, video later:
   - Use Canva API for static images ($12/user/year)
   - Add video when user hits revenue milestones

**Recommendation**: Start with **ChatGPT Pro plan shared** = $200/mes flat  
Cost per user: **$5-10/mes** (amortized over 20-40 users)

### 4. Infrastructure

**Fixed Costs** (per month):
| Service | Cost | Purpose |
|---------|------|---------|
| Railway (Backend) | $20 | Node.js API + agents |
| Vercel (Frontend) | $20 | React dashboard + landing |
| Supabase (PostgreSQL) | $20 | Production database |
| Cloudflare (DNS/CDN) | $0 | Free tier |
| **Total** | **$60/mes** | **Fixed** |

**Cost per user**: Decreases as users scale  
- 10 users: $6/user  
- 50 users: $1.20/user  
- 100 users: $0.60/user

---

## 📊 Total Cost Per User

| Cost Component | Conservative | Realistic | Notes |
|----------------|--------------|-----------|-------|
| **LLM** | $25 | $30 | Based on usage |
| **Resend** | $0.40 | $0.40 | 1K emails/mes |
| **Sora Videos** | $10 | $50 | Shared ChatGPT Pro vs API |
| **Infrastructure** | $2 | $1 | At 30-60 users |
| **Total** | **$37.40** | **$81.40** | Per user/month |

---

## 💡 Unit Economics

### Conservative Scenario (Shared Video Gen)
```
Revenue per user: $85/mes
Cost per user: $37.40/mes
Gross Margin: $47.60/mes (56%)
Profit Margin: 56%
```

**Break-even**: 2 Pro users  
**Highly profitable**

### Realistic Scenario (API Video Gen)
```
Revenue per user: $85/mes
Cost per user: $81.40/mes
Gross Margin: $3.60/mes (4%)
Profit Margin: 4%
```

**Break-even**: ~17 Pro users  
**Razor-thin margins**

---

## 🎯 Recommended Strategy

### Phase 1: Launch (0-20 users)
```
✅ Use ChatGPT Pro ($200/mes flat)
✅ 500 videos/month shared across users
✅ Cost: ~$10/user for videos
✅ High margins: ~50%
```

### Phase 2: Growth (20-100 users)
```
✅ Static ads by default
✅ Video ads = premium tier (+$20/mes)
✅ Or user pays ad production ($50/mes)
✅ Maintain 40-50% margins
```

### Phase 3: Scale (100+ users)
```
✅ Negotiate wholesale video pricing
✅ Third-party Sora APIs ($3-4/video)
✅ Or invest in own Sora license
✅ Target 50%+ margins
```

---

## 🔧 Cost Optimization Ideas

### 1. LLM Costs ($30/user → $15/user)
- Use Haiku for more tasks
- Cache common responses
- Compress prompts
- Batch API calls

### 2. Resend Costs ($0.40/user → $0.20/user)
- Smarter send limits
- Email warm-up reduces bounces
- Consolidate transactional emails

### 3. Sora Videos (BIGGEST LEVER)
- **Tier 1**: Static ads only (free)
- **Tier 2**: 5 videos/mes ($10 extra)
- **Tier 3**: Unlimited ($50 extra)
- Let users opt-in to video

### 4. Infrastructure ($60/mes flat)
- Start on free tiers (Vercel, Supabase free)
- Delay paid hosting until 10+ users
- Use SQLite locally instead of Supabase

---

## 💵 Pricing Strategy

### Current: $39/mes
```
Revenue: $85/mes (with ads commission)
Cost: $37-81/mes (depending on video)
Margin: 4-56%
```

**Risk**: If users demand lots of video, margins collapse.

### Recommended: Tiered Pricing

#### Free Tier
```
Price: $0
Features: Landing page, basic email
Limits: No Meta Ads, no videos
Cost to us: $5/user/mes (LLM + infra)
Purpose: Acquisition funnel
```

#### Pro Tier - $39/mes
```
Features: Full stack (ads, email, Twitter)
Includes: 5 static Meta Ads/month
Videos: $10/video extra (on-demand)
Cost to us: ~$35/user
Margin: ~$4/user (10%)
```

#### Premium Tier - $99/mes (NEW)
```
Features: Everything + unlimited videos
Includes: 20 AI videos/month
Priority: Faster execution, dedicated support
Cost to us: ~$85/user
Margin: ~$14/user (14%)
Target: Power users, agencies
```

**With tiering**:
- Free users: Break-even at scale
- Pro users: Thin but positive margin
- Premium users: Healthy margin
- Average margin: 20-30% (blended)

---

## 🎲 Scenarios

### Scenario A: 50 Pro Users @ $39/mes

**Revenue**:
- MRR: $1,950
- Revenue share: $500
- Ads commission: $1,800
- **Total: $4,250/mes**

**Costs** (conservative):
- LLM: $1,500
- Resend: $20
- Sora (shared): $500
- Infrastructure: $60
- **Total: $2,080/mes**

**Profit**: $2,170/mes (51% margin) ✅

### Scenario B: 50 Pro Users @ $39/mes (API videos)

**Revenue**: $4,250/mes

**Costs** (realistic):
- LLM: $1,500
- Resend: $20
- Sora (API @ 10 videos/user): $7,500 ❌
- Infrastructure: $60
- **Total: $9,080/mes**

**Profit**: -$4,830/mes (LOSS) ❌

---

## ✅ Final Recommendations

### 1. Video Strategy
```
🎯 START: ChatGPT Pro shared ($200/mes flat)
   → Cost: $4-10/user at 20-50 users
   → Sustainable margins

🎯 SCALE: Tiered pricing
   → Static ads default
   → Videos = premium add-on
   → User pays for heavy video use
```

### 2. Pricing
```
🎯 Keep $39/mes base
🎯 Add $99/mes Premium tier (unlimited video)
🎯 Or charge $10/video à la carte
🎯 Let users choose based on need
```

### 3. Break-Even
```
🎯 With conservative costs: 2 users
🎯 With realistic costs (shared video): 10 users
🎯 With API videos: 17+ users (risky)
```

### 4. Target Margins
```
🎯 Aim for 40-50% gross margin
🎯 Requires smart video pricing
🎯 Or subsidize early, optimize later
```

---

## 🚨 Key Risks

1. **Sora costs explode** if users create many videos
   - Mitigation: Usage caps, premium tier
   
2. **LLM costs higher than expected**
   - Mitigation: Model optimization, caching
   
3. **Revenue share lower than projected**
   - Mitigation: Don't count on it initially

---

## 📈 Dashboard Integration

All these costs are now tracked in:
```
GET /api/admin/financials/dashboard

Response includes:
- revenue.adsCommission (15% of ad spend)
- costs.resend ($0.40/user/mes)
- costs.sora ($10-150/user based on usage)
- costs.llm (actual from usage logs)
- costs.infrastructure ($60 fixed)
- breakeven.usersNeeded
- unitEconomics.ltv, cac, margins
```

Financial Agent monitors and alerts when:
- Margins drop below 30%
- Video costs exceed threshold
- Break-even moves >20 users

---

**COST ANALYSIS COMPLETE** 📊  
**Dashboard updated with Resend, Sora, Ads commission** ✅
