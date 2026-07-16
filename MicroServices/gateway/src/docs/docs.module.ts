import { Module } from '@nestjs/common';
import { DocsController } from './docs.controller';
import { OpenApiSpecService } from './openapi-spec.service';

@Module({
  controllers: [DocsController],
  providers: [OpenApiSpecService],
  exports: [OpenApiSpecService],
})
export class DocsModule {}
