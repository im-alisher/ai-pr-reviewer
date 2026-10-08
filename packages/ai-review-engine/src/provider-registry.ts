import { ReviewerError } from '@ai-pr-reviewer/shared';
import type { AIProvider } from './types';
import { GroqProvider, type GroqProviderOptions } from './providers/groq-provider';

export const DEFAULT_PROVIDER_NAME = 'groq';

export class ProviderRegistry {
  private readonly providers = new Map<string, AIProvider>();

  register(provider: AIProvider): this {
    this.providers.set(provider.name, provider);
    return this;
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  get(name: string): AIProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ReviewerError(
        'ai_provider_error',
        `AI provider "${name}" is not registered. Available providers: ${this.names().join(', ') || 'none'}.`,
      );
    }
    return provider;
  }

  names(): string[] {
    return [...this.providers.keys()];
  }
}

export function resolveProviderName(preferred?: string): string {
  return (
    preferred ?? process.env.AI_PROVIDER ?? DEFAULT_PROVIDER_NAME
  ).trim().toLowerCase();
}

export function createDefaultRegistry(
  groqOptions: GroqProviderOptions = {},
): ProviderRegistry {
  return new ProviderRegistry().register(new GroqProvider(groqOptions));
}
