/**
 * Token estimation using tiktoken
 */

import { encoding_for_model } from "tiktoken";
import { TokenEstimate } from "./models";
import { logger } from "./logger";

export class TokenEstimator {
  private static readonly defaultModel = "gpt-3.5-turbo";
  private static instance: TokenEstimator;
  private encodingCache: Map<string, ReturnType<typeof encoding_for_model>> = new Map();

  private constructor() {}

  public static getInstance(): TokenEstimator {
    if (!TokenEstimator.instance) {
      TokenEstimator.instance = new TokenEstimator();
    }
    return TokenEstimator.instance;
  }

  /**
   * Estimate tokens for given text using specified model
   */
  public estimateTokens(
    prompt: string,
    completion: string,
    model: string = TokenEstimator.defaultModel
  ): TokenEstimate {
    try {
      const encoding = this.getEncoding(model);

      const promptTokens = encoding.encode(prompt).length;
      const completionTokens = encoding.encode(completion).length;

      return {
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        totalTokens: promptTokens + completionTokens,
      };
    } catch (error) {
      logger.error("Failed to estimate tokens", error);
      return {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      };
    }
  }

  /**
   * Estimate tokens for prompt only
   */
  public estimatePromptTokens(text: string, model: string = TokenEstimator.defaultModel): number {
    try {
      const encoding = this.getEncoding(model);
      return encoding.encode(text).length;
    } catch (error) {
      logger.error("Failed to estimate prompt tokens", error);
      return 0;
    }
  }

  /**
   * Estimate tokens for completion only
   */
  public estimateCompletionTokens(
    text: string,
    model: string = TokenEstimator.defaultModel
  ): number {
    try {
      const encoding = this.getEncoding(model);
      return encoding.encode(text).length;
    } catch (error) {
      logger.error("Failed to estimate completion tokens", error);
      return 0;
    }
  }

  /**
   * Get cached encoding for model or create new one
   */
  private getEncoding(model: string): ReturnType<typeof encoding_for_model> {
    if (!this.encodingCache.has(model)) {
      try {
        const encoding = encoding_for_model(model as "gpt-3.5-turbo");
        this.encodingCache.set(model, encoding);
      } catch (_error) {
        logger.warn(`Model ${model} not found, using default encoding`);
        const defaultEncoding = encoding_for_model(TokenEstimator.defaultModel as "gpt-3.5-turbo");
        this.encodingCache.set(model, defaultEncoding);
      }
    }

    return this.encodingCache.get(model)!;
  }

  /**
   * Calculate estimated cost in USD (GPT-3.5-turbo pricing)
   */
  public estimateCost(inputTokens: number, outputTokens: number): number {
    const inputCostPerToken = 0.0005 / 1000;
    const outputCostPerToken = 0.0015 / 1000;

    return inputTokens * inputCostPerToken + outputTokens * outputCostPerToken;
  }

  /**
   * Format tokens for display
   */
  public formatTokens(tokens: number): string {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(2)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(2)}K`;
    }
    return tokens.toString();
  }

  /**
   * Format cost for display
   */
  public formatCost(cost: number): string {
    return `$${cost.toFixed(4)}`;
  }
}

export const tokenEstimator = TokenEstimator.getInstance();
