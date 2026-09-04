import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs/promises";
import * as os from "os";
import path from "path";
import { saveSnapshot, getLastSnapshot, validateInput } from "./trend-tracker.js";
import { HealthReport } from "../types/health.js";

// Mock the modules
vi.mock("fs/promises");
vi.mock("os", () => ({
    homedir: vi.fn(() => "/mock/home"),
    default: {
        homedir: vi.fn(() => "/mock/home")
    }
}));


describe("trend-tracker", () => {
    const mockHomeDir = "/mock/home";
    const mockOwner = "testowner";
    const mockRepo = "testrepo";
    const mockReport: HealthReport = {
        repo: "testowner/testrepo",
        score: 85,
        grade: "B",
        breakdown: {},
        suggestions: [],
        checkedAt: "2026-09-04T12:00:00Z",
        gradeMeaning: "Good"
    };

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(os.homedir).mockReturnValue(mockHomeDir);
    });

    describe("validateInput", () => {
        it("should not throw on valid input", () => {
            expect(() => validateInput("valid-owner")).not.toThrow();
            expect(() => validateInput("valid_repo.name")).not.toThrow();
        });

        it("should throw on invalid input", () => {
            expect(() => validateInput("invalid/owner")).toThrow();
            expect(() => validateInput("invalid owner")).toThrow(); 
            expect(() => validateInput("invalid\\repo")).toThrow();
        });
    });

    describe("saveSnapshot", () => {
        it("should create directory and save snapshot to a new file", async () => {
            // Mock fs.stat to throw (simulating directory doesn't exist)
            vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));
            vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
            vi.mocked(fs.mkdir).mockResolvedValue(undefined);
            vi.mocked(fs.writeFile).mockResolvedValue(undefined);

            await saveSnapshot(mockOwner, mockRepo, mockReport);

            expect(fs.mkdir).toHaveBeenCalledWith(path.join(mockHomeDir, ".projectpulse", "snapshots"), { recursive: true });
            
            const expectedSnapshot = {
                score: 85,
                grade: "B",
                checkedAt: "2026-09-04T12:00:00Z"
            };
            
            // Check that writeFile was called with an array containing one item
            expect(fs.writeFile).toHaveBeenCalledWith(
                path.join(mockHomeDir, ".projectpulse", "snapshots", mockOwner, `${mockRepo}.json`),
                JSON.stringify([expectedSnapshot], null, 2)
            );
        });

        it("should append snapshot to an existing file", async () => {
            vi.mocked(fs.stat).mockResolvedValue({} as any);
            
            const existingSnapshot = {
                score: 70,
                grade: "C",
                checkedAt: "2026-09-03T12:00:00Z"
            };
            
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([existingSnapshot]));
            vi.mocked(fs.mkdir).mockResolvedValue(undefined);
            vi.mocked(fs.writeFile).mockResolvedValue(undefined);

            await saveSnapshot(mockOwner, mockRepo, mockReport);

            const expectedSnapshot = {
                score: 85,
                grade: "B",
                checkedAt: "2026-09-04T12:00:00Z"
            };
            
            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.any(String),
                JSON.stringify([existingSnapshot, expectedSnapshot], null, 2)
            );
        });
        
        it("should handle corrupted json gracefully", async () => {
            vi.mocked(fs.stat).mockResolvedValue({} as any);
            vi.mocked(fs.readFile).mockResolvedValue("invalid-json");
            vi.mocked(fs.mkdir).mockResolvedValue(undefined);
            vi.mocked(fs.writeFile).mockResolvedValue(undefined);
            
            await saveSnapshot(mockOwner, mockRepo, mockReport);
            
            const expectedSnapshot = {
                score: 85,
                grade: "B",
                checkedAt: "2026-09-04T12:00:00Z"
            };
            
            // Should fallback to empty array and push the new one
            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.any(String),
                JSON.stringify([expectedSnapshot], null, 2)
            );
        });

        it("should throw on path traversal attempt", async () => {
            await saveSnapshot("../etc", mockRepo, mockReport);
            expect(fs.writeFile).not.toHaveBeenCalled();
        });
    });

    describe("getLastSnapshot", () => {
        it("should return null if file does not exist", async () => {
            vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
            
            const result = await getLastSnapshot(mockOwner, mockRepo);
            
            expect(result).toBeNull();
        });

        it("should return null if file is empty or malformed", async () => {
            vi.mocked(fs.readFile).mockResolvedValue("[]");
            expect(await getLastSnapshot(mockOwner, mockRepo)).toBeNull();
            
            vi.mocked(fs.readFile).mockResolvedValue("invalid-json");
            expect(await getLastSnapshot(mockOwner, mockRepo)).toBeNull();
        });

        it("should return the last snapshot in the array", async () => {
            const snapshots = [
                { score: 60, grade: "D", checkedAt: "2026-09-01T12:00:00Z" },
                { score: 80, grade: "B", checkedAt: "2026-09-02T12:00:00Z" }
            ];
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(snapshots));
            
            const result = await getLastSnapshot(mockOwner, mockRepo);
            
            expect(result).toEqual(snapshots[1]);
        });

        it("should return null on path traversal attempt", async () => {
            const result = await getLastSnapshot("../etc", mockRepo);
            expect(result).toBeNull();
        });
    });
});
