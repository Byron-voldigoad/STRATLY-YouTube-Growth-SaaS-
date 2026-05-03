/**
 * Tests unitaires — NERRA Decision Engine
 *
 * Couvre les fonctions critiques qui ne dépendent pas de l'IA (pas de prompt Genkit) :
 * - evaluateDecision : verdict VALIDATED vs FAILED
 * - handleResistance : escalade 1 → 2 → 3
 * - acceptDecision : mise à jour accepted_at
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Supabase avant tout import ────────────────────────────────

// vi.mock est hoisted — il s'exécute avant les imports
// On ne peut pas utiliser de variables extérieures dans la factory

const mockFrom = vi.fn();

vi.mock("../lib/supabase.js", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

// On mock aussi genkit et googleapis car decisionEngine.ts les importe
vi.mock("genkit", () => ({
  genkit: vi.fn(),
  z: { object: vi.fn(), string: vi.fn(), number: vi.fn(), enum: vi.fn(), array: vi.fn(), any: vi.fn() },
}));

vi.mock("googleapis", () => ({
  google: { auth: { OAuth2: vi.fn() }, youtube: vi.fn() },
}));

// Import AFTER mocking
import {
  evaluateDecision,
  handleResistance,
  acceptDecision,
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

  it("devrait retourner FAILED si le résultat est inférieur au baseline", async () => {
    mockFrom.mockReturnValue(
      mockSupabaseChain({
        data: { id: "dec-3", baseline_value: 100, confidence_score: 0.5 },
        error: null,
      }),
    );

    const result = await evaluateDecision("dec-3", 80); // -20%
    expect(result.verdict).toBe("FAILED");
    expect(result.improvement).toBe(-20);
  });

  it("devrait retourner FAILED avec improvement 0 si baseline est 0", async () => {
    mockFrom.mockReturnValue(
      mockSupabaseChain({
        data: { id: "dec-4", baseline_value: 0, confidence_score: 0.5 },
        error: null,
      }),
    );

    const result = await evaluateDecision("dec-4", 50);
    expect(result.verdict).toBe("FAILED");
    expect(result.improvement).toBe(0);
  });

  it("devrait retourner VALIDATED au seuil exact de 5%", async () => {
    mockFrom.mockReturnValue(
      mockSupabaseChain({
        data: { id: "dec-5", baseline_value: 100, confidence_score: 0.5 },
        error: null,
      }),
    );

    const result = await evaluateDecision("dec-5", 105); // exactement +5%
    expect(result.verdict).toBe("VALIDATED");
    expect(result.improvement).toBe(5);
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

  it("2ème refus → retourne level 2 (tension)", async () => {
    mockFrom.mockReturnValue(
      mockSupabaseChain({
        data: { id: "dec-r2", resistance_count: 1 },
        error: null,
      }),
    );

    const result = await handleResistance("dec-r2");
    expect(result.level).toBe(2);
    expect(result.message).toContain("tension_score");
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

  it("devrait throw si la décision est introuvable", async () => {
    mockFrom.mockReturnValue(
      mockSupabaseChain({ data: null, error: { message: "not found" } }),
    );

    await expect(handleResistance("invalid")).rejects.toThrow(
      "Décision introuvable",
    );
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
