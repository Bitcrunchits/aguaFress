import { Module } from '@nestjs/common';
import { ActionResolverService } from './action-resolver.service';

@Module({
  providers: [ActionResolverService],
  exports: [ActionResolverService],
})
export class ActionsModule {}
