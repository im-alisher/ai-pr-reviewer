import { PULL_REQUEST_URL_REGEX } from '@ai-pr-reviewer/shared';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class GeneratePatchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Matches(PULL_REQUEST_URL_REGEX, {
    message:
      'prUrl must be a public GitHub pull request URL such as https://github.com/owner/repo/pull/123',
  })
  prUrl!: string;

  @IsObject()
  report!: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  findingIds?: string[];
}
