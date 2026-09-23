// Risultato singolo check
type CheckStatus = 'pass' | 'fail' | 'unknown';

// Singolo check della checklist
type BestPracticeCheck = {
  name: string;           // es. "README.md"
  status: CheckStatus;
  weight: number;         // 1 (basso), 2 (medio), 3 (alto)
  detail: string;         // spiegazione umana
}

// Report finale del tool
type BestPracticesReport = {
  repo: string;
  score: number;          // 0-100 pesato
  grade: string;          // A-F (riusa Grade da health.ts se vuoi)
  totalChecks: number;
  passed: number;
  failed: number;
  unknown: number;
  checks: BestPracticeCheck[];
  suggestions: string[];  // azioni concrete per i fail
  checkedAt: string;      // ISO timestamp
}

export type { CheckStatus, BestPracticeCheck, BestPracticesReport };
