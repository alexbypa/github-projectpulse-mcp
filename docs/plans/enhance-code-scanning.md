# Plan: Code Scanning Alert Enrichment

> **Stato:** Completato (2026-08-30)
> **Fase:** 3.5
> **Versione pubblicata:** npm (post v1.0.3)

## Problema

`analyze_code_scanning` restituiva solo metadati base degli alert (rule ID, severity, path, start_line).
Mancava `most_recent_instance.message.text` — il campo che spiega *perché* il codice è vulnerabile.
Senza questo, l'AI vede l'alert ma non capisce il problema specifico.
Inoltre il filtro `state: "open"` era stato perso in un commit precedente.

## Cosa è stato fatto

### Arricchimento output

Aggiunti 4 campi al `.map()` in `src/tools/analyze-code-scanning.ts`:

| Campo | Sorgente API | Scopo |
|-------|-------------|-------|
| `alert_number` | `alert.number` | ID alert nel repo, per riferimento |
| `message_text` | `alert.most_recent_instance.message?.text` | Spiegazione vulnerabilità specifica |
| `end_line` | `alert.most_recent_instance.location?.end_line` | Range preciso codice vulnerabile |
| `created_at` | `alert.created_at` | Quando scoperto |

### Fix state filter

Ripristinato `state: "open"` nella chiamata API `listAlertsForRepo`. Era stato perso in un commit precedente.
Test aggiornato per verificare che il parametro `state: 'open'` venga passato all'API.

### Description arricchita

Tool description aggiornata per elencare tutti i campi restituiti e evidenziare `message_text` come campo chiave.
Guida l'AI a includere la spiegazione della vulnerabilità nella formattazione output.

### Test

Mock data e assertion aggiornati per tutti i nuovi campi + parametro `state: 'open'`.

## Cosa è stato postponed

### Tool `get_file_content` + `create_pull_request`

**Motivo:** leggere un file da GitHub senza poter creare una PR con il fix è un workflow incompleto.
Da implementare insieme quando si decide di abilitare "Option A" (AI applica fix).

**Note tecniche per implementazione futura:**
- `getContent`: `octokit.repos.getContent({ owner, repo, path, ref? })` — ritorna base64
- `listAlertsForRepo` dà dati riassuntivi; `getAlert` singolo dà più dettaglio — considerare per ottimizzazione
- Copilot Autofix text NON disponibile via REST API GitHub (solo UI web)

## Verifica

- `npm run build` ✓
- `npm test` — 74/74 pass ✓
- MCP Inspector: `message_text` presente, solo alert `state: "open"` ✓
- Nuova versione pubblicata su npm ✓
