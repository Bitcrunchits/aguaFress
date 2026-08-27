import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductDto } from './update-product.dto';

const VALID_CATEGORY_ID = '3f5a7b1e-3f0a-4c8a-9d2e-1a2b3c4d5e6f';

describe('Product DTO image validation', () => {
  it('acepta imagen relativa devuelta por upload en create', async () => {
    const dto = plainToInstance(CreateProductDto, {
      nombre: 'Bidón 20L',
      precioSinIva: 100,
      categoriaId: VALID_CATEGORY_ID,
      stock: 5,
      imagen: 'products/foo.webp',
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'imagen')).toBeUndefined();
  });

  it('acepta URL http existente por compatibilidad', async () => {
    const dto = plainToInstance(UpdateProductDto, { imagen: 'https://cdn.example.com/products/foo.png' });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'imagen')).toBeUndefined();
  });

  it('rechaza paths relativos fuera de products', async () => {
    const dto = plainToInstance(UpdateProductDto, { imagen: 'logos/logo.webp' });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'imagen')).toBeDefined();
  });

  it('rechaza path traversal en imagen', async () => {
    const dto = plainToInstance(UpdateProductDto, { imagen: 'products/../logo.webp' });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'imagen')).toBeDefined();
  });

  it('rechaza imagen no string en update', async () => {
    const dto = plainToInstance(UpdateProductDto, { imagen: 123 });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'imagen')).toBeDefined();
  });

  it('rechaza imagen demasiado larga en update', async () => {
    const dto = plainToInstance(UpdateProductDto, { imagen: `products/${'a'.repeat(500)}.webp` });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'imagen')).toBeDefined();
  });
});
