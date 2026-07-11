import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { OpenApiSpecService } from './openapi-spec.service';

@ApiExcludeController()
@Controller()
export class DocsController {
  constructor(private readonly specService: OpenApiSpecService) {}

  @Get('api/openapi.json')
  @Header('Content-Type', 'application/json')
  getSpec(): Record<string, unknown> {
    return this.specService.generateSpec();
  }

  @Get('api/docs')
  @Header('Content-Type', 'text/html')
  getDocs(@Res() res: Response): void {
    const html = `<!DOCTYPE html>
<html>
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
  <script
    id="api-reference"
    data-url="/api/openapi.json"
    data-configuration='{"theme":"purple","showSidebar":true,"hideDownloadButton":false,"searchHotKey":"s","servers":[{"url":"http://localhost:3000","description":"Desarrollo local"}],"authentication":{"preferredSecurityScheme":"bearerAuth"}}'
  ></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`;
    res.send(html);
  }

  @Get('/')
  redirectToDocs(@Res() res: Response): void {
    res.redirect('/api/docs');
  }
}
