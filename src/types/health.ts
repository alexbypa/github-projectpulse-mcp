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
  gradeMeaning: string;
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

export type TrendSnapshot = {
  score: number;
  grade: Grade;
  checkedAt: string;
}

type Recommendation = {
  category: string;
  priority: "high" | "medium" | "low";
  message: string;
  impact: string;
}

export type RecommendationContext = {
  ciPassed: number;
  ciTotal: number;
  daysSinceLastPush: number;
  alerts: { critical: number; high: number; medium: number; low: number };
  hasLicense: boolean;
  hasDescription: boolean;
  archived: boolean;
  openIssues: number;
  forks: number;
}

export { Grade, CategoryScore, HealthReport, ComparisonResult, Recommendation };