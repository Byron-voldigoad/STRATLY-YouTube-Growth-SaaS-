/**
 * Tests unitaires — NERRA Decision Engine
 *
 * Couvre les fonctions critiques qui ne dépendent pas de l'IA (pas de prompt Genkit) :
 * - evaluateDecision : verdict VALIDATED vs FAILED
 * - handleResistance : escalade 1 → 2 → 3
 * - acceptDecision : mise à jour accepted_at
 * - evaluateCustomTitle : structure de la réponse et règles de format
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Supabase avant tout import ────────────────────────────────

const mockFrom = vi.fn();

vi.mock("../lib/supabase.js", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

// Mock youtubeAnalytics pour fetchNicheTrends
vi.mock("../youtubeAnalytics.js", () => ({
  fetchNicheTrends: vi.fn().mockResolvedValue([
    { title: "Benchmark Video 1", views: 1000000 },
    { title: "Benchmark Video 2", views: 500000 },
  ]),
  fetchMarketContext: vi.fn().mockResolvedValue({
    contextString: "OCÉAN BLEU DÉTECTÉ : test marché anime.",
    marketStatus: "OCEAN_BLUE",
    avgViews: 0,
  }),
  analyzeThumbnail: vi.fn(),
  fetchChannelStats: vi.fn(),
  fetchRecentVideos: vi.fn(),
  fetchVideoStats: vi.fn(),
}));

// On mock googleapis car decisionEngine.ts l'importe
vi.mock("googleapis", () => ({
  google: { auth: { OAuth2: vi.fn() }, youtube: vi.fn() },
}));

// Import AFTER mocking some modules
import {
  evaluateDecision,
  handleResistance,
  acceptDecision,
  evaluateCustomTitle,
  evaluateVideoConcept,
} from "../decisionEngine.js";

// ─── Helper pour créer une chaîne Supabase mockée ──────────────────

function mockSupabaseChain(singleResult: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(singleResult),
  };
  return chain;
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("evaluateDecision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devrait retourner VALIDATED si amélioration >= 5%", async () => {
    mockFrom.mockReturnValue(
      mockSupabaseChain({
        data: { id: "dec-1", baseline_value: 100, confidence_score: 0.5 },
        error: null,
      }),
    );

    const result = await evaluateDecision("dec-1", 110); // +10%
    expect(result.verdict).toBe("VALIDATED");
    expect(result.improvement).toBe(10);
  });

  it("devrait retourner FAILED si amélioration < 5%", async () => {
    mockFrom.mockReturnValue(
      mockSupabaseChain({
        data: { id: "dec-2", baseline_value: 100, confidence_score: 0.5 },
        error: null,
      }),
    );

    const result = await evaluateDecision("dec-2", 103); // +3%
    expect(result.verdict).toBe("FAILED");
    expect(result.improvement).toBe(3);
  });

  it("devrait throw si la décision est introuvable", async () => {
    mockFrom.mockReturnValue(
      mockSupabaseChain({ data: null, error: { message: "not found" } }),
    );

    await expect(evaluateDecision("invalid", 100)).rejects.toThrow(
      "Décision introuvable",
    );
  });
});

describe("handleResistance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1er refus → retourne level 1 (reformulation)", async () => {
    mockFrom.mockReturnValue(
      mockSupabaseChain({
        data: { id: "dec-r1", resistance_count: 0 },
        error: null,
      }),
    );

    const result = await handleResistance("dec-r1");
    expect(result.level).toBe(1);
    expect(result.message).toContain("reformule");
  });

  it("3ème refus → retourne level 3 (résistance confirmée)", async () => {
    mockFrom.mockReturnValue(
      mockSupabaseChain({
        data: { id: "dec-r3", resistance_count: 2 },
        error: null,
      }),
    );

    const result = await handleResistance("dec-r3");
    expect(result.level).toBe(3);
    expect(result.message).toContain("résistance confirmée");
  });
});

describe("acceptDecision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devrait appeler update avec accepted_at sur la bonne table", async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockFrom.mockReturnValue({ update: updateMock });

    await acceptDecision("dec-accept-1");

    expect(mockFrom).toHaveBeenCalledWith("decisions");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        accepted_at: expect.any(String),
      }),
    );
  });
});

describe("evaluateVideoConcept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.YOUTUBE_API_KEY = "mock-api-key";
  });

  it("doit inclure la règle critique d'alignement de niche dans le prompt système", async () => {
    const mockAi = {
      generate: vi.fn().mockResolvedValue({
        output: { niche_alignment: "hors_niche", concept_clarity: "precis", feedback: "Hors niche." },
      }),
    } as any;

    mockFrom.mockReturnValue(
      mockSupabaseChain({
        data: {
          id: "dec-concept-1",
          user_id: "user-1",
          channel_id: "channel-1",
          hypothesis: "Créer des AMV anime centrés sur des personnages populaires",
          experiment_type: "short",
          variable: "concept",
        },
        error: null,
      }),
    );

    await evaluateVideoConcept(
      mockAi,
      "dec-concept-1",
      "Comment trouver ses premiers clients en freelance en 2026",
    );

    expect(mockAi.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("ALIGNEMENT NICHE (CRITIQUE)"),
      }),
    );

    expect(mockAi.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("tu DOIS donner une note maximale de 3/10"),
      }),
    );
  });
});

describe("evaluateCustomTitle (Deterministic structure)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.YOUTUBE_API_KEY = "mock-api-key";
  });

  it("devrait retourner la structure correcte (score, feedback)", async () => {
    const mockAi = {
      generate: vi.fn().mockResolvedValue({
        output: { score: 8, feedback: "Bon titre." },
      }),
    } as any;

    mockFrom.mockReturnValue(
      mockSupabaseChain({
        data: { id: "dec-title-1", experiment_type: "TYPE_TITRE", hypothesis: "Test" },
        error: null,
      }),
    );

    const result = await evaluateCustomTitle(mockAi, "dec-title-1", "Mon super titre");

    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("feedback");
    expect(typeof result.score).toBe("number");
    expect(typeof result.feedback).toBe("string");
  });

  it("devrait retourner le score et feedback même si le score est élevé (>= 9)", async () => {
    const mockAi = {
      generate: vi.fn().mockResolvedValue({
        output: { score: 10, feedback: "Titre parfait, prêt à publier" },
      }),
    } as any;

    mockFrom.mockReturnValue(
      mockSupabaseChain({
        data: { id: "dec-title-2", experiment_type: "TYPE_TITRE", hypothesis: "Test" },
        error: null,
      }),
    );

    const result = await evaluateCustomTitle(mockAi, "dec-title-2", "Le titre ultime");

    expect(result.score).toBeGreaterThanOrEqual(9);
    expect(result.feedback).toBeDefined();
  });
});
