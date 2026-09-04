import { TrendSnapshot, HealthReport } from "../types/health.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const STORAGE_DIR = path.join(os.homedir(), ".projectpulse", "snapshots");

export async function saveSnapshot(owner: string, repo: string, report: HealthReport) {
    try {
        validateInput(owner);
        validateInput(repo);
        if (!(await fs.stat(STORAGE_DIR).catch(() => null))) {
            await fs.mkdir(STORAGE_DIR, { recursive: true });
        }
        const repoDir = path.join(STORAGE_DIR, owner);
        const repoFile = path.join(repoDir, `${repo}.json`);

        const snapshot: TrendSnapshot = {
            score: report.score,
            grade: report.grade,
            checkedAt: report.checkedAt,
        };
        await fs.mkdir(repoDir, { recursive: true }).catch(() => { });

        // Leggi lo storico esistente o inizializza un array vuoto
        let snapshots: TrendSnapshot[] = [];
        try {
            const fileContent = await fs.readFile(repoFile, "utf-8");
            snapshots = JSON.parse(fileContent);
            if (!Array.isArray(snapshots)) {
                snapshots = []; // Fallback in caso di file corrotto o vecchio formato
            }
        } catch (e) {
            // Il file probabilmente non esiste ancora
        }

        // Aggiungi il nuovo snapshot
        snapshots.push(snapshot);

        // Sovrascrivi il file con l'intero array
        await fs.writeFile(repoFile, JSON.stringify(snapshots, null, 2));
    } catch (error) {
        console.error("Error saving snapshot:", error);
    }
}

export async function getLastSnapshot(owner: string, repo: string): Promise<TrendSnapshot | null> {
    try {
        validateInput(owner);
        validateInput(repo);
        const repoFile = path.join(STORAGE_DIR, owner, `${repo}.json`);
        const data = await fs.readFile(repoFile, "utf-8").catch(() => null);
        if (!data) return null;

        const snapshots = JSON.parse(data);
        if (Array.isArray(snapshots) && snapshots.length > 0) {
            // Ritorna sempre l'ultimo elemento dell'array
            return snapshots[snapshots.length - 1];
        }
        return null;
    } catch (error) {
        console.error("Error getting snapshot:", error);
        return null;
    }
}

export function validateInput(value: string): void {
    if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
        throw new Error(`Invalid input: "${value}"`);
    }
}