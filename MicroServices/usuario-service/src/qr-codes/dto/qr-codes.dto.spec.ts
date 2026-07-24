import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ListQrCodesDto } from './list-qr-codes.dto';

describe('ListQrCodesDto', () => {
  it('usa valores por defecto cuando se pasa objeto vacío', async () => {
    const dto = plainToInstance(ListQrCodesDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('acepta valores válidos de page y limit', async () => {
    const dto = plainToInstance(ListQrCodesDto, {
      page: 2,
      limit: 25,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
  });

  it('rechaza page como string no numérico', async () => {
    const dto = plainToInstance(ListQrCodesDto, { page: 'abc' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('page');
  });

  it('acepta vendedorId como UUID válido', async () => {
    const dto = plainToInstance(ListQrCodesDto, {
      vendedorId: '123e4567-e89b-12d3-a456-426614174000',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.vendedorId).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('rechaza vendedorId como string no UUID', async () => {
    const dto = plainToInstance(ListQrCodesDto, {
      vendedorId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('vendedorId');
  });

  it('rechaza limit mayor a 100', async () => {
    const dto = plainToInstance(ListQrCodesDto, { limit: 101 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('limit');
  });
});
