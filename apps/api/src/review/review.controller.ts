import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import type {
  AnalyzePullRequestResponse,
  GeneratePatchResponse,
} from '@ai-pr-reviewer/shared';
import { AnalyzePullRequestDto } from './dto/analyze-pull-request.dto';
import { GeneratePatchDto } from './dto/generate-patch.dto';
import { ReviewService } from './review.service';

@Controller('review')
export class ReviewController {
  constructor(
    @Inject(ReviewService) private readonly reviewService: ReviewService,
  ) {}

  @Post('analyze')
  @HttpCode(200)
  analyze(
    @Body() dto: AnalyzePullRequestDto,
  ): Promise<AnalyzePullRequestResponse> {
    return this.reviewService.analyze(dto.prUrl);
  }

  @Post('patch')
  @HttpCode(200)
  generatePatch(@Body() dto: GeneratePatchDto): Promise<GeneratePatchResponse> {
    return this.reviewService.generatePatch(
      dto.prUrl,
      dto.report,
      dto.findingIds,
    );
  }
}
