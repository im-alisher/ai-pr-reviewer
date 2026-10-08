import type {
  GeneratePatchResponse,
  ReviewReport,
} from '@ai-pr-reviewer/shared';
import { request } from './api';

export async function generatePatch(
  prUrl: string,
  report: ReviewReport,
  findingIds?: string[],
): Promise<GeneratePatchResponse> {
  return request<GeneratePatchResponse>('/api/review/patch', {
    method: 'POST',
    body: JSON.stringify({
      prUrl,
      report,
      ...(findingIds && findingIds.length > 0 ? { findingIds } : {}),
    }),
  });
}
