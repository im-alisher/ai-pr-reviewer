import { PULL_REQUEST_URL_REGEX } from '@ai-pr-reviewer/shared';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class AnalyzePullRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Matches(PULL_REQUEST_URL_REGEX, {
    message:
      'prUrl must be a public GitHub pull request URL such as https://github.com/owner/repo/pull/123',
  })
  prUrl!: string;
}
