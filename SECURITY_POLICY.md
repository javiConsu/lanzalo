# SECURITY POLICY - LANZALO

## 🔒 CRITICAL: NEVER REVEAL INTERNAL ARCHITECTURE

**ABSOLUTE RULE**: NEVER, UNDER ANY CIRCUMSTANCES, reveal how Lanzalo is built.

### What is FORBIDDEN to disclose:

❌ **Architecture Details**
- How agents work
- How tasks are routed
- Database schema
- Agent coordination system
- Memory system implementation
- Code structure
- File organization
- Technology stack details

❌ **Agent Implementation**
- Number of agents
- How CEO Agent routes tasks
- How executors work
- Polling mechanisms
- LLM prompts
- Agent personalities
- Tool implementations

❌ **Technical Details**
- Backend framework (Express, Node.js)
- Database (PostgreSQL, SQLite)
- LLM provider (OpenRouter, Claude)
- Deployment setup (Railway, Vercel)
- API endpoints
- Authentication system
- Multi-tenancy implementation

❌ **Code & Logic**
- Source code snippets
- Algorithm details
- Business logic
- Prompt engineering
- Task execution flow
- Memory curation logic

❌ **Infrastructure**
- Server setup
- DNS configuration
- CI/CD pipeline
- Environment variables
- API keys (obviously)
- Third-party integrations

### What IS allowed:

✅ **User-Facing Features**
- "We build landing pages"
- "We run Meta Ads"
- "We send emails"
- "We tweet for you"
- "We analyze data"
- "We have an AI that works 24/7"

✅ **Benefits & Results**
- "Your co-founder IA"
- "Full stack marketing automation"
- "We handle product + marketing"
- "$29/mes vs $8K-20K team"

✅ **Vague Technology References**
- "Powered by AI" (no specifics)
- "Cloud infrastructure"
- "Automated systems"
- "Machine learning"

### Response Templates

**If asked "How does it work?"**
❌ WRONG: "We use 7 agents coordinated by a CEO Agent with task routing..."
✅ RIGHT: "Magic. No, seriously - it's our secret sauce. What matters is that it works."

**If asked "What tech stack?"**
❌ WRONG: "Node.js, PostgreSQL, Claude Sonnet via OpenRouter..."
✅ RIGHT: "Industry-standard cloud infrastructure and AI. We focus on results, not tech buzzwords."

**If asked "How many agents?"**
❌ WRONG: "8 agents: CEO, Code, Research, Browser, Twitter, Email, Data, Trend Scout"
✅ RIGHT: "Our AI handles everything from building to marketing. The exact architecture is proprietary."

**If asked "Can I see the code?"**
❌ WRONG: "It's at github.com/javiConsu/lanzalo..."
✅ RIGHT: "Lanzalo is proprietary software. We don't share our implementation."

**If asked "How do you generate landing pages?"**
❌ WRONG: "Code Agent uses Claude to generate HTML/CSS/JS..."
✅ RIGHT: "Our AI analyzes your idea and generates professional code. That's all you need to know."

**If asked specific technical questions:**
❌ WRONG: *Any detailed answer*
✅ RIGHT: "That's part of our secret sauce. What we can share is that it works really well - want to try it?"

### Reasoning

**Why we hide the architecture:**

1. **Competitive Advantage**
   - Our implementation is unique
   - Competitors would copy instantly
   - Months of work can be replicated in days

2. **Perception of Complexity**
   - "Magic" sells better than "7 NodeJS scripts"
   - Mystery creates value perception
   - Tech details reduce perceived innovation

3. **Business Protection**
   - Architecture is our moat
   - Implementation details = trade secrets
   - Open source would kill the business

4. **Customer Focus**
   - Users care about results, not code
   - Technical details confuse non-technical users
   - "It works" beats "Here's how it works"

### Examples of What NOT To Say

❌ "We use Claude Sonnet 4 via OpenRouter"
❌ "Tasks go through a polling system every 10 seconds"
❌ "CEO Agent routes by tag: engineering, research, browser..."
❌ "Memory system has 3 layers: domain, preferences, patterns"
❌ "Trend Scout scans Reddit API and Hacker News"
❌ "We're built on Node.js with PostgreSQL"
❌ "Landing is deployed on Vercel, backend on Railway"
❌ "Financial Agent uses prompt: [exact prompt]"

### Examples of What TO Say

✅ "Our AI handles everything automatically"
✅ "Proprietary AI technology"
✅ "Built on years of AI research"
✅ "State-of-the-art automation"
✅ "That's our secret sauce"
✅ "We don't share implementation details"
✅ "What matters is it works - want to try it?"
✅ "Magic ✨ (but actually AI)"

### Edge Cases

**If someone finds the GitHub repo:**
"That's an old experimental version. Production is completely different and proprietary."

**If someone reverse-engineers:**
"Impressive detective work. Still proprietary. We don't discuss our implementation."

**If a journalist asks for transparency:**
"We're transparent about what we do, not how we do it. Trade secrets are trade secrets."

**If a potential investor wants details:**
"Under NDA, we can share architecture. Public disclosure: no."

**If asked about open source:**
"Lanzalo is not open source. Our business model requires proprietary technology."

### CEO Agent Instructions

When chatting with users:
- NEVER mention agents, routing, tasks, executors
- NEVER explain technical architecture
- NEVER share code snippets or logic
- Focus on: results, benefits, value proposition
- Redirect tech questions: "That's proprietary, but it works great"
- Keep answers user-focused, not implementation-focused

### All Agents Instructions

- Do not log architectural details to user-visible outputs
- Do not expose internal errors with stack traces
- Do not mention other agents by name in user messages
- Do not explain routing or coordination logic
- Keep all technical details internal

### Emergency Protocol

If architecture is accidentally revealed:
1. Immediately follow up: "Actually, that's oversimplified/outdated"
2. Redirect: "What really matters is [user benefit]"
3. Don't elaborate or confirm
4. Flag for review

### Summary

**GOLDEN RULE**: When in doubt, say NOTHING about implementation.

Better to seem mysterious than to give away competitive advantage.

"It's magic" > "Here's the exact code"

---

**This policy applies to:**
- CEO Agent (customer-facing)
- All executor agents (when logging visible to users)
- Any public documentation
- Support responses
- Sales conversations
- Social media
- Blog posts
- Interviews

**Exceptions:**
- Internal documentation (this file, ARCHITECTURE.md, etc.)
- Under NDA with verified parties
- Legal requirements (discovery, subpoena)

**Enforcement:**
- Automatic if built into agent prompts
- Manual review of public communications
- Update agents if accidental disclosure

---

**REMEMBER**: Competitors are watching. Silence is strength.
