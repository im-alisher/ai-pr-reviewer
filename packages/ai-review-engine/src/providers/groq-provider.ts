import {
  DEFAULT_GROQ_MODEL,
  GROQ_API_BASE_URL,
  LIMITS,
  ReviewerError,
} from '@ai-pr-reviewer/shared';
import type {
  AIProvider,
  AIProviderRequest,
  AIProviderResponse,
  FetchLike,
} from '../types';

export interface GroqProviderOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

interface GroqChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  model?: string;
}

export class GroqProvider implements AIProvider {
  readonly name = 'groq';

  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: GroqProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GROQ_API_KEY;
    this.model =
      options.model ?? process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL;
    this.baseUrl = (options.baseUrl ?? GROQ_API_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? LIMITS.aiTimeoutMs;
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      throw new ReviewerError(
        'ai_missing_api_key',
        'No Groq API key configured. Set the GROQ_API_KEY environment variable.',
      );
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.prompt },
          ],
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens ?? 4_096,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ReviewerError(
        'ai_provider_error',
        `Groq request failed: ${message}`,
      );
    }

    if (!response.ok) {
      const detail = await this.readErrorDetail(response);
      throw new ReviewerError(
        'ai_provider_error',
        `Groq API responded with status ${response.status}${detail}`,
      );
    }

    let payload: GroqChatResponse;
    try {
      payload = (await response.json()) as GroqChatResponse;
    } catch {
      throw new ReviewerError(
        'ai_invalid_response',
        'Groq API returned a non-JSON response body.',
      );
    }

    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new ReviewerError(
        'ai_invalid_response',
        'Groq API returned an empty completion.',
      );
    }

    return { content, model: payload.model ?? this.model };
  }

  private async readErrorDetail(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      const message = body.error?.message;
      return message ? `: ${message}` : '';
    } catch {
      return '';
    }
  }
}
