import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@ApiBearerAuth()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly service: MetricsService) {}

  @Post('recompute')
  recompute(@CurrentUser() user: Usuario) {
    return this.service.recomputeAll(user);
  }

  @Get('data-quality')
  dataQuality(@CurrentUser() user: Usuario) {
    return this.service.getDataQuality(user);
  }

  @Get('risk')
  risk(@CurrentUser() user: Usuario) {
    return this.service.getRiskScores(user);
  }

  @Get('risk/:accionId')
  riskByAccion(@Param('accionId') accionId: string, @CurrentUser() user: Usuario) {
    return this.service.getRiskByAccion(accionId, user);
  }

  @Get('evm')
  evmPortfolio(@CurrentUser() user: Usuario) {
    return this.service.getEvmPortfolio(user);
  }

  @Get('evm/:accionId')
  evmByAccion(@Param('accionId') accionId: string, @CurrentUser() user: Usuario) {
    return this.service.getEvmByAccion(accionId, user);
  }

  @Get('geo')
  geo(@CurrentUser() user: Usuario) {
    return this.service.getGeoAggregates(user);
  }

  @Get('contractors')
  contractors(@CurrentUser() user: Usuario) {
    return this.service.getContractorScores(user);
  }

  @Get('anomalies')
  anomalies(@CurrentUser() user: Usuario) {
    return this.service.getAnomalies(user);
  }

  @Get('forecast')
  forecast(@CurrentUser() user: Usuario) {
    return this.service.getForecast(user);
  }

  @Get('mir')
  mir(@CurrentUser() user: Usuario) {
    return this.service.getMirKpis(user);
  }

  @Get('compliance')
  compliance(@CurrentUser() user: Usuario) {
    return this.service.getCompliance(user);
  }

  @Get('attention-today')
  attentionToday(@CurrentUser() user: Usuario) {
    return this.service.getAttentionToday(user);
  }

  @Get('recommendations')
  recommendations(@CurrentUser() user: Usuario) {
    return this.service.getRecommendations(user);
  }

  @Post('recommendations/:id/approve')
  approveRecommendation(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.approveRecommendation(id, user);
  }

  @Get('activos')
  activos(@CurrentUser() user: Usuario) {
    return this.service.getActivos(user);
  }

  @Post('documents/index')
  indexDocuments(@CurrentUser() user: Usuario) {
    return this.service.indexDocuments(user);
  }

  @Get('documents/search')
  @ApiQuery({ name: 'q', required: true })
  searchDocuments(
    @Query('q') query: string,
    @CurrentUser() user: Usuario,
    @Query('limit') limit?: string,
  ) {
    return this.service.searchDocuments(query, user, limit ? Number(limit) : 10);
  }

  @Get('briefing')
  briefing(@CurrentUser() user: Usuario) {
    return this.service.generateBriefing(user);
  }

  @Get('portfolio/priority')
  portfolioPriority(@CurrentUser() user: Usuario) {
    return this.service.getPortfolioPriority(user);
  }

  @Post('semantic')
  semantic(@Body('intent') intent: string) {
    return this.service.semanticMetricQuery(intent ?? '');
  }
}
