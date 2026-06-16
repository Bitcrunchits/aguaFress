import {Module} from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { HealthModule } from './health/health.module';
@Module({
    imports: [CommonModule, DeliveriesModule, HealthModule],
})
export class AppModule {}