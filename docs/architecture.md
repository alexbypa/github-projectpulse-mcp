# Architecture Decisions — ProjectPulse MCP

> Documento vivo: aggiornato durante il brainstorming e lo sviluppo.
> Ultimo aggiornamento: 2026-08-28

---

## Decisioni Prese

### ADR-001: Standalone TypeScript, non .NET
**Decisione:** MCP server in TypeScript pubblicato su npm, separato da FlowScheduler.
**Motivazione:**
- npm ha ~30M developer vs ~5M .NET — massima reach
- MCP SDK TypeScript è il reference implementation ufficiale
- Language-agnostic tool = non serve .NET runtime per usarlo
- FlowScheduler resta progetto .NET separato, connesso in Fase 5
**Alternativa scartata:** MCP server in .NET (NuGet) — limita adoption.

### ADR-002: GitHub API via Octokit, non API dirette
**Decisione:** Usare `@octokit/rest` SDK ufficiale.
**Motivazione:**
- Type safety built-in
- Auth handling automatico
- Rate limit info negli header
- Supportato da GitHub stessa
**Alternativa scartata:** `fetch` diretto — più codice boilerplate, nessun vantaggio.

### ADR-003: Zod per validazione, non runtime checks manuali
**Decisione:** Ogni tool MCP valida input con Zod schema.
**Motivazione:**
- Schema = documentazione + validazione + type inference in un colpo
- MCP SDK supporta Zod nativamente
- Pattern coerente con community MCP
**Alternativa scartata:** `if (!input.repo) throw` — ripetitivo, no type inference.

### ADR-004: Functions + types, non classi
**Decisione:** Architettura functional con `type` + exported functions.
**Motivazione:**
- TypeScript idiomatico per tool piccoli e focused
- Più semplice da testare (no instantiation, no constructor)
- Tree-shaking migliore (bundler elimina funzioni non usate)
**Alternativa scartata:** Class-based OOP — overengineering per MCP server.
**Eccezione:** Octokit client può essere singleton class se serve stato (rate limit counter).

### ADR-005: Health Score come weighted average
**Decisione:** Score 0-100 = media pesata di 5 categorie (CI 25%, Security 25%, Freshness 20%, Community 15%, Maintenance 15%).
**Motivazione:**
- Semplice da capire e spiegare
- Pesi configurabili per use case diversi
- Grade A/B/C/D/F intuitivo
**Da validare:** Pesi iniziali sono ipotesi — calibrare dopo test su repo reali.

### ADR-006: Repo pubblico da subito
**Decisione:** GitHub repo pubblico dal primo commit.
**Motivazione:**
- Commit history visibile ai recruiter
- Mostra processo di sviluppo, non solo risultato
- Permette contributi esterni dal giorno 1
**Rischio accettato:** Errori iniziali visibili — mitigato con commit puliti e progressivi.

---

## Decisioni Pendenti

### PENDING-001: Trend storage locale
**Opzioni:**
- A) File JSON locale (`~/.projectpulse/trends.json`)
- B) SQLite embedded
- C) Solo in-memory (no persistenza standalone)
**Da decidere in:** Fase 4

### PENDING-002: Badge serving
**Opzioni:**
- A) Shields.io custom endpoint
- B) GitHub Pages static serving
- C) Vercel/Cloudflare Worker
**Da decidere in:** Fase 4

---

## Principi Architetturali

1. **Zero config default** — `npx projectpulse-mcp` deve funzionare senza setup
2. **Token opzionale** — repo pubblici senza auth, privati con GITHUB_TOKEN
3. **Graceful degradation** — se un'API fallisce, le altre metriche funzionano comunque
4. **AI-first output** — tool descriptions e output pensati per AI agents, non solo umani
5. **Small surface** — pochi tool ben fatti > molti tool mediocri
