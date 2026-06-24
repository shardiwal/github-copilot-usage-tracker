/**
 * Cost estimation for Copilot language model usage.
 *
 * Prices are approximate equivalents (USD per 1M tokens) based on
 * the underlying models exposed by GitHub Copilot.  Because Copilot
 * is subscription-based these figures are estimates for analysis
 * purposes only.
 */

interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // GPT-4o family
  "gpt-4o":            { inputPerMillion: 5.00,  outputPerMillion: 15.00 },
  "copilot-gpt-4o":    { inputPerMillion: 5.00,  outputPerMillion: 15.00 },
  "gpt-4o-mini":       { inputPerMillion: 0.15,  outputPerMillion: 0.60  },

  // GPT-4 family
  "gpt-4":             { inputPerMillion: 30.00, outputPerMillion: 60.00 },
  "gpt-4-turbo":       { inputPerMillion: 10.00, outputPerMillion: 30.00 },
  "copilot-gpt-4":     { inputPerMillion: 30.00, outputPerMillion: 60.00 },

  // GPT-3.5
  "gpt-35-turbo":      { inputPerMillion: 0.50,  outputPerMillion: 1.50  },
  "gpt-3.5-turbo":     { inputPerMillion: 0.50,  outputPerMillion: 1.50  },

  // o1 family
  "o1":                { inputPerMillion: 15.00, outputPerMillion: 60.00 },
  "o1-mini":           { inputPerMillion: 1.10,  outputPerMillion: 4.40  },
  "o1-preview":        { inputPerMillion: 15.00, outputPerMillion: 60.00 },
  "o3-mini":           { inputPerMillion: 1.10,  outputPerMillion: 4.40  },

  // Claude
  "claude-3.5-sonnet": { inputPerMillion: 3.00,  outputPerMillion: 15.00 },
  "claude-3-haiku":    { inputPerMillion: 0.25,  outputPerMillion: 1.25  },
  "claude-3-opus":     { inputPerMillion: 15.00, outputPerMillion: 75.00 },
  "claude-sonnet-4":   { inputPerMillion: 3.00,  outputPerMillion: 15.00 },

  // Gemini
  "gemini-1.5-pro":    { inputPerMillion: 3.50,  outputPerMillion: 10.50 },
  "gemini-1.5-flash":  { inputPerMillion: 0.075, outputPerMillion: 0.30  },
};

/** Default pricing when the model is not in the table (assume gpt-4o equivalent) */
const DEFAULT_PRICING: ModelPricing = { inputPerMillion: 5.00, outputPerMillion: 15.00 };

/**
 * Returns the per-million-token pricing for a model.
 * Matches by checking whether the model id *contains* a known key.
 */
function getPricing(modelId: string): ModelPricing {
  const lower = modelId.toLowerCase();

  // Exact match first
  if (MODEL_PRICING[lower]) {
    return MODEL_PRICING[lower];
  }

  // Partial match
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (lower.includes(key) || key.includes(lower)) {
      return pricing;
    }
  }

  return DEFAULT_PRICING;
}

/**
 * Calculate the estimated cost in USD for a single request.
 *
 * @param modelId     The model id string (e.g. "gpt-4o", "claude-3.5-sonnet")
 * @param inputTokens Number of input/prompt tokens
 * @param outputTokens Number of output/completion tokens
 * @returns Estimated cost in USD (e.g. 0.000125)
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getPricing(modelId);
  const inputCost  = (inputTokens  / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  // Round to 8 decimal places to avoid floating-point noise in the DB
  return Math.round((inputCost + outputCost) * 1e8) / 1e8;
}

/**
 * Format a cost value as a human-readable USD string.
 * e.g. 0.000125 → "$0.000125"  |  1.234 → "$1.2340"
 */
export function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.000001) return `$${cost.toExponential(2)}`;
  if (cost < 0.01)     return `$${cost.toFixed(6)}`;
  if (cost < 1)        return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}
