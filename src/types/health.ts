// Union type per grade — come enum ma più leggero
type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

// Score di una singola categoria
type CategoryScore = {
  score: number;       // 0-100
  weight: number;      // 0.0-1.0
  detail: string;      // spiegazione
}

// Report finale
type HealthReport = {
  repo: string;
  score: number;           // 0-100 pesato
  grade: Grade;
  breakdown: Record<string, CategoryScore>;  // ← Record = Dictionary<K,V>
  suggestions: string[];
  checkedAt: string;       // ISO timestamp
}

type ComparisonResult = {
  compared_at: string;           // ISO timestamp
  repos: Array<{                 // array di risultati per repo
    owner: string;
    repo: string;
    rank: number;              // 1-based, 0 = errore
    health: HealthReport | null;  // riusa tipo esistente
    error: string | null;
  }>;

}

export { Grade, CategoryScore, HealthReport, ComparisonResult };