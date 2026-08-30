# Learning Path — C# Developer → TypeScript

> Stato: In Progress
> Ultimo aggiornamento: 2026-08-28

## Regola d'Oro

**L'AI NON scrive codice al posto tuo.** L'AI:
- Spiega il concetto e mostra l'equivalente C#
- Indica COSA creare (file, funzione, tipo) e PERCHÈ
- Fornisce lo scheletro o la firma, mai l'implementazione completa
- Revisiona il tuo codice dopo che l'hai scritto
- Corregge errori spiegando il perchè

**Tu scrivi ogni riga.** Se l'AI genera codice completo, fermala e chiedi solo la guida.
L'obiettivo è che tra 2 settimane sai scrivere TypeScript autonomamente, non che hai un progetto scritto dall'AI.

## Approccio
Impari **facendo**, non leggendo tutorial. Ogni concetto viene applicato subito nel codice di ProjectPulse.
Ogni sezione ha: concetto TS, equivalente C#, dove lo usi nel progetto, e stato completamento.

---

## Fase 0 — Fondamentali

| # | Concetto | C# equivalente | File ProjectPulse | Stato |
|---|----------|----------------|-------------------|-------|
| 1 | `package.json` (deps, scripts, metadata) | `.csproj` | `package.json` | [ ] |
| 2 | `tsconfig.json` (compiler options) | Project properties | `tsconfig.json` | [ ] |
| 3 | `import { x } from "./y"` | `using Namespace;` | Tutti i file | [ ] |
| 4 | `export function` / `export type` | `public class/interface` | Tutti i file | [ ] |
| 5 | `npm install` / `npm init` | `dotnet add package` / `dotnet new` | Setup | [ ] |
| 6 | `npx tsx src/index.ts` | `dotnet run` | Dev loop | [ ] |

### Note per C# dev
- **No namespace**: ogni file è un modulo. `import` è esplicito per ogni dipendenza.
- **No `public/private` su moduli**: se fai `export`, è pubblico. Se non fai `export`, è privato al modulo.
- **`const` vs `let`**: usa `const` di default (come `readonly`). `let` solo se riassegni. Mai `var`.

---

## Fase 1 — Async, HTTP, Validazione

| # | Concetto | C# equivalente | File ProjectPulse | Stato |
|---|----------|----------------|-------------------|-------|
| 7 | `async function(): Promise<T>` | `async Task<T>` | Tutti i tool | [ ] |
| 8 | `try/catch` + typed errors | `try/catch(Exception)` | `github/client.ts` | [ ] |
| 9 | Octokit SDK | `HttpClient` + GitHub API | `github/client.ts` | [ ] |
| 10 | `z.object({ repo: z.string() })` (Zod) | FluentValidation / DataAnnotations | `tools/*.ts` | [ ] |
| 11 | `const { data } = await ...` (destructuring) | `var result = await ...; var data = result.Data;` | Ovunque | [ ] |
| 12 | `` `Score: ${value}%` `` (template literal) | `$"Score: {value}%"` | Output formatting | [ ] |
| 13 | `process.env.GITHUB_TOKEN` | `IOptions<T>` / `IConfiguration` | `github/client.ts` | [ ] |
| 14 | Type narrowing dopo `if` | Pattern matching C# 11 | Error handling | [ ] |

### Note per C# dev
- **No `await Task.WhenAll()`**: usa `Promise.all([p1, p2])` — stessa cosa, nome diverso.
- **Destructuring è ovunque**: `const { data, status } = response` estrae campi inline. Usalo.
- **Zod non è decoratori**: è runtime validation + type inference. Definisci lo schema, TypeScript inferisce il tipo.

---

## Fase 2 — Paradigma Functional

| # | Concetto | C# equivalente | File ProjectPulse | Stato |
|---|----------|----------------|-------------------|-------|
| 15 | `.filter(x => x > 0)` | `.Where(x => x > 0)` | Score calc | [ ] |
| 16 | `.map(x => x.name)` | `.Select(x => x.Name)` | Data transform | [ ] |
| 17 | `.reduce((acc, x) => acc + x, 0)` | `.Aggregate(0, (acc, x) => acc + x)` | Score calc | [ ] |
| 18 | `.find(x => x.id === id)` | `.FirstOrDefault(x => x.Id == id)` | Lookups | [ ] |
| 19 | `.some(x => x.failed)` | `.Any(x => x.Failed)` | Checks | [ ] |
| 20 | `{ ...defaults, ...overrides }` (spread) | `record with { }` (C# 10) | Config merge | [ ] |
| 21 | `type Grade = 'A' \| 'B' \| 'C'` (union) | `enum Grade { A, B, C }` | Health score | [ ] |
| 22 | `Readonly<T>` | `readonly record` | Constants | [ ] |
| 23 | Generics `<T>` | Generics `<T>` | Utility funcs | [ ] |

### Note per C# dev
- **LINQ → Array methods**: stessa logica, nomi diversi. Non c'è `SelectMany` — usa `.flatMap()`.
- **No `new` per oggetti data**: `const x = { name: "foo" }` non `new Dto("foo")`.
- **Spread è potente**: `{ ...a, ...b }` sovrascrive campi di `a` con quelli di `b`. Come `record with {}` ma più flessibile.

---

## Fase 3 — Testing & Tooling

| # | Concetto | C# equivalente | File ProjectPulse | Stato |
|---|----------|----------------|-------------------|-------|
| 24 | `describe("suite", () => { ... })` | `public class MyTests` | Test files | [ ] |
| 25 | `it("should work", () => { ... })` | `[Fact] public void ShouldWork()` | Test methods | [ ] |
| 26 | `expect(x).toBe(y)` | `x.Should().Be(y)` (FluentAssertions) | Assertions | [ ] |
| 27 | `vi.mock("./module")` | `Mock<IService>` (Moq) | Mocking | [ ] |
| 28 | `npm run test` / `npm run build` | `dotnet test` / `dotnet build` | Scripts | [ ] |
| 29 | GitHub Actions per Node.js | GitHub Actions per .NET | CI/CD | [ ] |
| 30 | `npm publish --access public` | `dotnet nuget push` | Publish | [ ] |

### Note per C# dev
- **No classi test**: test sono funzioni dentro `describe()`. Più leggero di xUnit.
- **Mock moduli, non interfacce**: `vi.mock("./github/client")` mocka l'intero modulo. Non serve DI per testare.
- **`npm ci` vs `npm install`**: `ci` è per CI (lockfile esatto). `install` è per dev (aggiorna lockfile).

---

## Anti-Pattern da C# Dev in TypeScript

| Istinto C# | Cosa fare in TS | Perchè |
|------------|-----------------|--------|
| Creare una `class` per tutto | Usa `type` + funzioni | TS idiomatico è functional, non OOP |
| Prefisso `I` sulle interfacce | Niente prefisso: `HealthChecker` non `IHealthChecker` | Convenzione community TS |
| DI container (`IServiceCollection`) | Import diretto + factory function | Per progetti piccoli, DI container è overengineering |
| `private readonly _field` | `const` nel module scope | Moduli TS hanno già incapsulamento |
| `namespace MyApp.Tools` | Directory + import | Un file = un modulo = un namespace |
| `enum Status { ... }` | `type Status = "active" \| "inactive"` | Union types sono più type-safe e tree-shakeable |
| `null!` / `default!` | `undefined` check + optional chaining `?.` | TS ha `undefined` oltre a `null` |

---

## Come aggiornare questo documento
Dopo ogni fase completata:
1. Segna `[x]` sui concetti padroneggiati
2. Aggiungi note personali su difficoltà incontrate
3. Aggiungi pattern nuovi scoperti durante lo sviluppo
