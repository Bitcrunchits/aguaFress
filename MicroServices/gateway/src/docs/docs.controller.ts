import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { OpenApiSpecService } from './openapi-spec.service';

@ApiExcludeController()
@Public()
@Controller()
export class DocsController {
  constructor(private readonly specService: OpenApiSpecService) {}

  @Get('openapi.json')
  @Header('Content-Type', 'application/json')
  getSpec(): Record<string, unknown> {
    return this.specService.generateSpec();
  }

  @Get('docs')
  @Header('Content-Type', 'text/html')
  getDocs(@Res() res: Response): void {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AguaFress API — Documentación</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💧</text></svg>" />
  <style>
    body { margin: 0; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  <script>
    Scalar.createApiReference('#app', {
      url: '/api/openapi.json',
      proxyUrl: 'https://proxy.scalar.com',
    })
  </script>
</body>
</html>`;
    res.send(html);
  }

  @Get('/')
  redirectToDocs(@Res() res: Response): void {
    res.redirect('/api/docs');
  }
}
