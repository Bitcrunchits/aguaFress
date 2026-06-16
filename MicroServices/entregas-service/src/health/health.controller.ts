import {Controller, Get} from '@nestjs/common';
import {ApiTags, ApiOperation} from '@nestjs/swagger';
@ApiTags('Health')
@Controller('health')
export class HealthController {
    @Get()
    @ApiOperation({summary: 'Verificar que el servicio está activo'})
    checkHealth() {
        return {status: 'ok'};
    }
}