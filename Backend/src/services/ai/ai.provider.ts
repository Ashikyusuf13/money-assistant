import OpenAI from 'openai';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface IAIProvider {
  name: string;
  isConfigured(): boolean;
  generateCompletion(
    messages: AIMessage[],
    options?: AICompletionOptions,
  ): Promise<string>;
}

/**
 * OpenAI implementation of the IAIProvider interface.
 */
export class OpenAIProvider implements IAIProvider {
  public readonly name = 'openai';
  private client: OpenAI | null = null;

  constructor() {
    const apiKey = env.OPENAI_API || process.env['OPENAI_API_KEY'];
    if (apiKey && apiKey.startsWith('sk-')) {
      this.client = new OpenAI({
        apiKey,
        timeout: env.OPENAI_TIMEOUT_MS || 30000,
      });
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.client);
  }

  public async generateCompletion(
    messages: AIMessage[],
    options?: AICompletionOptions,
  ): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client is not configured with a valid API key');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        max_tokens: options?.maxTokens ?? env.OPENAI_MAX_TOKENS ?? 1000,
        temperature: options?.temperature ?? 0.3, // Low temperature for high factual accuracy
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Received empty completion from OpenAI');
      }

      return content.trim();
    } catch (err) {
      logger.error('OpenAI completion error', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

/**
 * Deterministic Mock AI Provider used for unit/integration testing or offline modes.
 */
export class MockAIProvider implements IAIProvider {
  public readonly name = 'mock';

  constructor(private mockResponse?: string) {}

  public isConfigured(): boolean {
    return true;
  }

  public async generateCompletion(): Promise<string> {
    return (
      this.mockResponse ||
      'Based on your verified records, your monthly finances are on track.'
    );
  }
}
