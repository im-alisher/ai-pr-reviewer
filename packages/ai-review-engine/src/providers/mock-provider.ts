import type {
  AIProvider,
  AIProviderRequest,
  AIProviderResponse,
} from '../types';

export type MockResponder = (
  request: AIProviderRequest,
) => string | AIProviderResponse;

export const DEFAULT_MOCK_REVIEW_JSON = JSON.stringify({
  summary:
    'This pull request updates the reviewed module with focused changes across a small set of files.',
  bugs: [
    {
      title: 'Possible null dereference',
      severity: 'high',
      description:
        'A value that may be null is used without a guard in the changed code path.',
      file: 'src/example.ts',
      line: 12,
      recommendation: 'Add an explicit null check before dereferencing.',
    },
  ],
  security: [
    {
      title: 'Unvalidated external input',
      severity: 'medium',
      description: 'External input reaches a sensitive sink without validation.',
      file: 'src/example.ts',
      line: 20,
      recommendation: 'Validate and sanitize the input before use.',
    },
  ],
  refactoring: [
    {
      title: 'Duplicated branch logic',
      severity: 'low',
      description: 'Two branches share nearly identical logic.',
      file: 'src/example.ts',
      line: 30,
      recommendation: 'Extract the shared logic into a helper function.',
    },
  ],
  complexity: [
    {
      title: 'Deeply nested conditionals',
      description: 'The new function nests conditionals three levels deep.',
      impact: 'medium',
      file: 'src/example.ts',
    },
  ],
  risk: {
    score: 42,
    rationale: 'Moderate blast radius with one high severity finding.',
    factors: ['Touches shared code path', 'Contains one high severity issue'],
  },
});

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  readonly requests: AIProviderRequest[] = [];

  private readonly responder: MockResponder;

  constructor(responder: MockResponder = () => DEFAULT_MOCK_REVIEW_JSON) {
    this.responder = responder;
  }

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    this.requests.push(request);
    const result = this.responder(request);
    if (typeof result === 'string') {
      return { content: result, model: 'mock-model' };
    }
    return result;
  }
}
