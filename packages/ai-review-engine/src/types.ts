export interface AIProviderRequest {
  systemPrompt: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIProviderResponse {
  content: string;
  model: string;
}

export interface AIProvider {
  readonly name: string;
  generate(request: AIProviderRequest): Promise<AIProviderResponse>;
}

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;
