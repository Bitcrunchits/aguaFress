# Design: Tech Batch — Imágenes, Categorías, Email

## 1. Upload Pipeline Architecture

### Decisión clave

Los uploads se manejan **en el gateway** (no via TCP). El gateway:

1. Recibe el multipart
2. Valida tipo y tamaño
3. Convierte a WebP con sharp
4. Genera nanoid
5. Guarda en filesystem
6. Devuelve el `imageId`

El microservicio (products-service / usuario-service) **nunca ve el binario**. Solo recibe el `imageId` como string en el DTO.

### Diagrama

```
[Frontend]                           [Gateway]                      [Filesystem]
    │                                    │                              │
    │ POST /upload/product-image         │                              │
    │ Content-Type: multipart/form-data  │                              │
    │ File: imagen.jpg                   │                              │
    │ ──────────────────────────>        │                              │
    │                                    │  multer → parse file        │
    │                                    │  sharp → convert to WebP    │
    │                                    │  nanoid → unique filename   │
    │                                    │  write → uploads/products/  │
    │                                    │ ─────────────────────────>  │
    │                                    │                              │
    │ <── { imageId: "products/xxx.webp" }                              │
    │                                    │                              │
    │ POST /products/create              │                              │
    │ Body: { imagen: "products/xxx.webp" }                             │
    │ ──────────────────────────>        │                              │
    │                                    │ TCP → products-service      │
    │                                    │ (imagen en body, sin file)  │
    │                                    │                              │
    │ <── { id, created }               │                              │
```

## 2. Gateway Upload Controller

```typescript
// MicroServices/gateway/src/upload/upload.controller.ts

@Controller('v1/upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('product-image')
  @Roles('vendedor')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    const imageId = await this.uploadService.saveImage(file, 'products');
    return { imageId };
  }

  @Post('vendor-logo')
  @Roles('vendedor')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVendorLogo(@UploadedFile() file: Express.Multer.File) {
    const imageId = await this.uploadService.saveImage(file, 'logos');
    return { imageId };
  }
}
```

## 3. UploadService

```typescript
// MicroServices/gateway/src/upload/upload.service.ts

@Injectable()
class UploadService {
  constructor(
    private readonly config: ConfigService,
  ) {}

  async saveImage(file: Express.Multer.File, subdir: string): Promise<string> {
    // 1. Validar tipo MIME
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Formato no soportado');
    }

    // 2. Validar tamaño (default 5MB)
    const maxSize = this.config.get<number>('upload.maxSizeMb', 5) * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('Archivo excede el tamaño máximo');
    }

    // 3. Convertir a WebP
    const webpBuffer = await sharp(file.buffer)
      .webp({ quality: this.config.get<number>('upload.webpQuality', 80) })
      .toBuffer();

    // 4. Generar nanoid
    const id = nanoid();
    const filename = `${id}.webp`;

    // 5. Guardar
    const uploadDir = this.config.get<string>('upload.dir', './public/uploads');
    const fullPath = path.join(uploadDir, subdir, filename);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, webpBuffer);

    // 6. Devolver ruta relativa
    return `${subdir}/${filename}`;
  }
}
```

## 4. Configuración

```env
# gateway .env
UPLOAD_DIR=./public/uploads
UPLOAD_MAX_SIZE_MB=5
UPLOAD_WEBP_QUALITY=80
```

## 5. Static file serving

El gateway debe servir los archivos estáticos para que el frontend pueda acceder a las imágenes:

```typescript
// gateway/src/main.ts
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/uploads',
  });
  // ...
}
```

URL de acceso: `https://dominio/uploads/products/abc123.webp`

## 6. Integración con productos

### Crear producto (sin cambios en DTO)
```typescript
// CreateProductDto.imagen sigue siendo string opcional
// Antes: "https://ejemplo.com/imagen.jpg"
// Ahora: "products/abc123.webp"
```

### ProductResponse
```typescript
// ProductResponse.imagen también string opcional
// El frontend reconstruye la URL: `${BASE_URL}/uploads/${imagen}`
```

## 7. Integración con vendedores

### Registro
```typescript
// RegisterDto.logo — nuevo campo opcional
@IsOptional()
@IsString()
@MaxLength(500)
logo?: string;
```

### Update perfil
```typescript
// UpdateVendedorProfileDto.logo — ya existe, misma semántica
// Antes: URL externa
// Ahora: "logos/abc123.webp"
```

## 8. Directorio de uploads

```
gateway/
  public/
    uploads/
      products/
        abc123.webp
        def456.webp
      logos/
        ghi789.webp
```

## 9. Dependencias (gateway)

```json
{
  "dependencies": {
    "sharp": "^0.33.x",
    "nanoid": "^5.x"
  }
}
```

Multer ya viene incluido con NestJS (`@nestjs/platform-express`).

## 10. Estrategia de almacenamiento futuro

Si en el futuro se necesita S3/CDN, el cambio es mínimo:
- `UploadService` pasa a usar SDK de S3 en vez de `fs.writeFile`
- La ruta devuelta es la URL de S3 en vez de path local
- El frontend no necesita cambios porque siempre recibe un string `imageId`

Esto mantiene el **DIP**: el UploadService depende de una abstracción (interfaz), no de fs/S3 directamente.

## 11. Resumen de archivos nuevos vs modificados

### Gateway (archivos nuevos)
- `src/upload/upload.controller.ts`
- `src/upload/upload.service.ts`
- `src/upload/upload.module.ts`

### Gateway (modificaciones)
- `src/main.ts` — agregar static assets
- `src/actions/action-registry.ts` — entries CRUD
- `src/docs/openapi-spec.service.ts` — schemas + action docs
- `package.json` — agregar sharp + nanoid
- `.env` — agregar UPLOAD_*

### products-service (modificaciones)
- `src/categories/categories.service.ts` — CRUD methods
- `src/categories/dto/` — 4 DTOs nuevos
- `src/tcp/categories-tcp.controller.ts` — handlers CRUD

### usuario-service (modificaciones)
- `src/auth/dto/register.dto.ts` — logo opcional
- `src/vendedores/vendedores.service.ts` — email en list

### contracts (modificaciones)
- `packages/contracts/src/dto/user.dto.ts` — VendedorResponse.email
