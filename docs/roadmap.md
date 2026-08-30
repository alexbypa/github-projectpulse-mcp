# ProjectPulse MCP — Roadmap & Learning Path

> **Package name:** `projectpulse-mcp` (verified available on npm — 2026-08-28)
> **Repo:** `github.com/alexbypa/projectpulse-mcp` (da creare)
> **Stack:** TypeScript, Node.js, MCP SDK
> **Obiettivo:** MCP Server standalone per health monitoring di qualsiasi repo GitHub
> **Obiettivo personale:** Apprendimento TypeScript/Node.js + visibilità come AI Engineer

---

## Mappa Fondamentale C# → TypeScript

| # | C# (sai già) | TypeScript (impari) | Quando lo usi |
|---|--------------|---------------------|---------------|
| 1 | `csproj` + NuGet | `package.json` + npm | Fase 0 |
| 2 | `namespace` + `using` | `import/export` (ES modules) | Fase 0 |
| 3 | `interface IFoo` | `interface Foo` / `type Foo` | Fase 0 |
| 4 | `async Task<T>` | `async/await` + `Promise<T>` | Fase 1 |
| 5 | `record Dto(...)` | `type Dto = { ... }` | Fase 1 |
| 6 | `HttpClient` + `IHttpClientFactory` | `fetch` (built-in) / `Octokit` | Fase 1 |
| 7 | `IOptions<T>` / `appsettings.json` | `process.env` + `dotenv` | Fase 1 |
| 8 | Exception handling (`try/catch/finally`) | Identico + `Error` types | Fase 1 |
| 9 | `IServiceCollection` DI | Constructor injection manuale | Fase 2 |
| 10 | Extension methods | Utility functions + module re-export | Fase 2 |
| 11 | Generics `<T>` | Generics `<T>` (quasi identici) | Fase 2 |
| 12 | LINQ (`.Where().Select()`) | `.filter().map()` (Array methods) | Fase 2 |
| 13 | `xUnit` + `FluentAssertions` | `vitest` + expect API | Fase 3 |
| 14 | GitHub Actions per .NET | GitHub Actions per npm publish | Fase 3 |
| 15 | NuGet publish | `npm publish` | Fase 3 |

### Risorse di Riferimento Rapido

| Risorsa | URL | Quando |
|---------|-----|--------|
| TypeScript Handbook (ufficiale) | https://www.typescriptlang.org/docs/handbook/ | Fase 0, consultazione |
| Node.js Docs | https://nodejs.org/docs/latest/api/ | Fase 0, consultazione |
| MCP SDK TypeScript | https://github.com/modelcontextprotocol/typescript-sdk | Fase 0, reference |
| Octokit.js (GitHub API) | https://github.com/octokit/octokit.js | Fase 1, reference |
| Zod (validation) | https://zod.dev | Fase 1, reference |
| Vitest (testing) | https://vitest.dev | Fase 3, reference |

---

## Fase 0 — Setup & Hello MCP (1-2 giorni)

### Obiettivo
Ambiente TypeScript pronto. MCP server che si avvia e risponde a ping.

### [LEARN] Concetti nuovi in questa fase
- **package.json** — equivalente di `.csproj`. Contiene nome, versione, dipendenze, scripts
- **tsconfig.json** — equivalente delle property del progetto .NET. Configura compilatore TS
- **import/export** — al posto di `using` + `namespace`. Ogni file è un modulo isolato
- **`npm init`, `npm install`** — equivalente di `dotnet new` + `dotnet add package`
- **`npx tsx`** — esegue TypeScript direttamente (come `dotnet run`)

### Struttura progetto

```
projectpulse-mcp/
├── src/
│   ├── index.ts              ← Entry point: crea e avvia MCP server
│   ├── tools/                ← Un file per tool (come IJobCommand)
│   │   └── ping.ts           ← Primo tool di test
│   ├── github/               ← GitHub API client wrapper
│   │   └── client.ts
│   └── types/                ← Type definitions condivise
│       └── index.ts
├── package.json
├── tsconfig.json
├── .gitignore
├── .env.example              ← Template per GITHUB_TOKEN
├── LICENSE                   ← MIT
└── README.md
```

### Steps
1. `npm init -y` → crea package.json
2. `npm install @modelcontextprotocol/sdk @octokit/rest zod dotenv`
3. `npm install -D typescript tsx @types/node vitest`
4. Configura `tsconfig.json` (target ES2022, module NodeNext)
5. Scrivi `src/index.ts` — MCP server con un tool `ping` che risponde "pong"
6. Testa con Claude Desktop o MCP Inspector
7. **Checkpoint:** `npx tsx src/index.ts` avvia server, Claude lo vede

### Esercizio apprendimento
> Scrivi `src/index.ts` da zero seguendo la doc MCP SDK. Non copiare boilerplate.
> Obiettivo: capire come MCP server dichiara tools, riceve richieste, risponde.

---

## Fase 1 — Core Tools: GitHub Integration (3-5 giorni)

### Obiettivo
3 tool MCP funzionanti su qualsiasi repo GitHub pubblico.

### [LEARN] Concetti nuovi in questa fase
- **async/await con Promise** — identico a C#, ma `Promise` al posto di `Task`
- **Octokit** — GitHub SDK ufficiale per JS/TS. Equivalente di `HttpClient` + GitHub API
- **Zod schemas** — validazione input dichiarativa. Come FluentValidation ma più compatto
- **Type narrowing** — TypeScript infierisce tipi dopo `if` checks (simile a pattern matching C#)
- **Destructuring** — `const { data } = await octokit.repos.get(...)` (non esiste in C#)
- **Template literals** — `` `Score: ${value}%` `` (come string interpolation `$"Score: {value}%"`)

### Tools da implementare

| Tool | Input | Output | GitHub API |
|------|-------|--------|-----------|
| `check_ci_status` | `owner/repo` | Ultimi N workflow runs: status, durata, branch, conclusione | `GET /repos/{o}/{r}/actions/runs` |
| `get_repo_health` | `owner/repo` | Stars, issues aperte, PR aperte, ultimo commit, license, linguaggi | `GET /repos/{o}/{r}` |
| `analyze_dependencies` | `owner/repo` | Dependabot alerts per severity, outdated count | `GET /repos/{o}/{r}/dependabot/alerts` |
| `analyze_code_scanning` | `owner/repo` | CodeQL alerts: vulnerabilità codice, severity, file+riga, stato | `GET /repos/{o}/{r}/code-scanning/alerts` |

### Architettura interna

```
MCP Tool request
    │
    ▼
tools/check-ci-status.ts     ← Zod validation → GitHub call → format response
    │
    ▼
github/client.ts              ← Octokit singleton, auth opzionale, rate limit retry
    │
    ▼
types/index.ts                ← CiStatusResult, RepoHealthResult, DependencyAlert
```

### Pattern da applicare (già li conosci in C#)
- **Single Responsibility:** 1 tool = 1 file, come `IJobCommand`
- **Singleton client:** GitHub client creato una volta, come `IChatClientFactory`
- **Input validation al boundary:** Zod schema su input MCP, come `SqlReadOnlyMiddleware`
- **Graceful error handling:** Rate limit → retry con backoff, come `FallbackChatClient`

### Esercizio apprendimento
> Implementa `github/client.ts` con rate limit handling.
> Confronta mentalmente con `FallbackChatClient.IsRetryableError` — stesso principio, altro linguaggio.

---

## Fase 1.5 — Review & Padronanza Codice (1 giorno)

### Obiettivo
Consolidare tutto il codice scritto in Fase 1. L'utente deve poter spiegare ogni riga, modificare con sicurezza, proporre miglioramenti.

### Attività
1. **Walkthrough guidato** — AI chiede "cosa fa questa riga?", utente spiega. Corregge se sbagliato.
2. **Esercizi mirati** — piccole modifiche che testano padronanza dei costrutti nuovi:
   - Aggiungere un campo a un `.map()`
   - Cambiare uno Zod schema e gestire nuovo parametro
   - Aggiungere error handling con try/catch
   - Usare `Promise.all()` per chiamate parallele
3. **Refactor autonomo** — utente propone miglioramenti al proprio codice, AI revisiona

### Concetti verificati
- `import/export` e moduli ES
- `async/await` + `Promise<T>`
- Destructuring (oggetto e array)
- `.map()` vs `.forEach()`
- Zod schema + validazione
- Singleton pattern in TS
- Optional chaining `?.`
- Template literals
- `JSON.stringify` per output

---

## Fase 2 — Health Score Engine (2-3 giorni)

### Obiettivo
Tool `get_health_score` che aggrega metriche in punteggio 0-100 con grade e suggerimenti.

### [LEARN] Concetti nuovi in questa fase
- **Array methods** — `.filter()`, `.map()`, `.reduce()` = LINQ `.Where()`, `.Select()`, `.Aggregate()`
- **Generics** — quasi identici a C# (`function calculate<T>(input: T): Result<T>`)
- **Union types** — `type Grade = 'A' | 'B' | 'C' | 'D' | 'F'` (come enum ma più flessibile)
- **Readonly types** — `Readonly<Config>` = immutabilità come `record` in C#
- **Spread operator** — `{ ...defaults, ...overrides }` per merge oggetti

### Algoritmo Health Score

```typescript
const WEIGHTS = {
  ci:          0.25,   // CI green? Failure rate ultimi 10 run?
  freshness:   0.20,   // Ultimo commit < 30 giorni?
  community:   0.15,   // Issue response time, PR merge time
  security:    0.25,   // Dependabot alerts count + severity
  maintenance: 0.15,   // README, LICENSE, CI config, branch protection
} as const;
```

### Output type

```typescript
type HealthReport = {
  repo: string;
  score: number;           // 0-100
  grade: Grade;            // A/B/C/D/F
  breakdown: {
    [category: string]: {
      score: number;
      weight: number;
      detail: string;
    };
  };
  suggestions: string[];   // Actionable improvements
  checkedAt: string;       // ISO timestamp
};
```

### Esercizio apprendimento
> Riscrivi il calcolo score usando solo `.map()` e `.reduce()`.
> Se ti viene da scrivere un `for` loop, fermati e pensa a come farlo functional.
> Questo è il cambio di paradigma più grande da C# a TS idiomatico.

---

## Fase 3 — Testing, CI & Publish npm (2-3 giorni)

### Obiettivo
Test suite, CI pipeline, pacchetto pubblicato su npm.

### [LEARN] Concetti nuovi in questa fase
- **Vitest** — test runner moderno. Sintassi: `describe/it/expect` (come xUnit ma con closure)
- **Mocking** — `vi.mock()` per mock moduli. Concetto uguale a Moq/NSubstitute
- **npm scripts** — `"scripts": { "test": "vitest", "build": "tsc" }` in package.json
- **npm publish** — workflow di pubblicazione pacchetto
- **GitHub Actions per Node.js** — simile a quello .NET ma con `actions/setup-node`
- **`bin` field in package.json** — rende il pacchetto eseguibile con `npx`

### Struttura test

```
tests/
├── tools/
│   ├── check-ci-status.test.ts
│   ├── get-repo-health.test.ts
│   └── analyze-dependencies.test.ts
├── scoring/
│   └── health-score.test.ts
└── github/
    └── client.test.ts          ← Mock Octokit, test rate limit retry
```

### CI Pipeline (.github/workflows/ci.yml)

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm test
      - run: npm run build

  publish:
    needs: test
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Checklist publish
- [ ] `README.md` con GIF/screenshot di Claude che usa ProjectPulse
- [ ] `npx projectpulse-mcp` funziona senza setup
- [ ] `package.json` ha `bin`, `keywords`, `description` corretti
- [ ] License MIT
- [ ] `.npmignore` esclude test e file dev
- [ ] Tag `v1.0.0` → publish automatico via CI

### Esercizio apprendimento
> Scrivi test per `health-score.ts` con Vitest.
> Nota differenza con xUnit: no classi, no attributi `[Fact]`, solo funzioni.

---

## Fase 4 — Differenziatori per Visibilità (3-5 giorni)

### Feature in ordine di impatto

| # | Feature | Impatto | Effort |
|---|---------|---------|--------|
| 1 | **Multi-repo comparison** | Alto — team lead dream tool | 1 giorno |
| 2 | **Trend tracking locale** | Alto — storico in JSON locale | 1 giorno |
| 3 | **Badge SVG generator** | Virale — `![Health](url/badge)` nei README | 1 giorno |
| 4 | **Claude Desktop tutorial** | Adozione — abbassa barriera ingresso | 0.5 giorni |
| 5 | **AI-powered suggestions** | Wow factor — non solo dati ma consigli | 1-2 giorni |

### Tool aggiuntivi

```
compare_repos(["owner/repo1", "owner/repo2", ...])
  → Tabella comparativa con score per ogni repo

get_health_trend(owner/repo, days=30)
  → Dati trend score nel tempo

generate_badge(owner/repo)
  → URL badge SVG con score
```

---

## Fase 5 (Futura) — FlowScheduler Bridge

### Architettura

```
projectpulse-mcp (npm, standalone)
    │
    │ HTTP API / webhook
    ▼
FlowScheduler.Infrastructure
    ├── ProjectPulse/
    │   ├── IProjectPulseClient.cs        ← Core interface
    │   ├── ProjectPulseClient.cs          ← HTTP client
    │   └── ProjectPulseExtension.cs       ← DI registration
    │
FlowScheduler.BackgroundJobs
    ├── Jobs/
    │   └── ProjectPulseHealthCheckJob.cs  ← HangFire cron
    │
    └── HangFire cron: ogni 6h chiama health_score per N repo
        → salva in RedisMetricsStore
        → alert Telegram se score scende sotto soglia
        → RAG ingestion per knowledge base
```

### Valore per portfolio
- **ProjectPulse npm** → mostra: TypeScript, MCP, AI tooling, open source
- **FlowScheduler .NET** → mostra: architettura enterprise, SOLID, Hangfire, Redis
- **Bridge tra i due** → mostra: system design, integrazione cross-stack

---

## Timeline Complessiva

```
Settimana 1                    Settimana 2                    Settimana 3+
───────────────────────────────────────────────────────────────────────
[Fase 0: Setup    ] [Fase 1: Core Tools           ] [Fase 2: Score  ]
 1-2 gg              3-5 gg                          2-3 gg

                                                     [Fase 3: Publish]
                                                      2-3 gg

                                                     [Fase 4: Differenziatori]
                                                      3-5 gg
                                                                      ──►
                                                              Fase 5: Bridge
```

**MVP pubblicabile su npm: ~2 settimane**
**Versione con differenziatori: ~3 settimane**
**Bridge FlowScheduler: quando MVP è stabile**

---

## Metriche di Successo

| Milestone | Target | Come misurare |
|-----------|--------|---------------|
| v1.0.0 su npm | Pubblicato | `npm view projectpulse-mcp` |
| Adoption | 50+ download/settimana | npm stats |
| GitHub stars | 100+ primo mese | GitHub repo |
| Community | 5+ issues/PR da esterni | GitHub activity |
| Portfolio | Citato in CV/LinkedIn | Recruiter feedback |

---

*Documento generato durante sessione di brainstorming — 2026-08-28*
*Progetto parallelo a FlowScheduler (.NET) — non lo sostituisce*
