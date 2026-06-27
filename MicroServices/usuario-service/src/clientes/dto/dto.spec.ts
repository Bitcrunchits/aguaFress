import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { TipoFactura } from '@agua/contracts';
import { ListClientesDto } from './list-clientes.dto';
import { UpdateClienteDto } from './update-cliente.dto';
import { UpdateClienteVendedorDto } from './update-cliente-vendedor.dto';
import { ReasignarVendedorDto } from './reasignar-vendedor.dto';

// ─── ListClientesDto ───

describe('ListClientesDto', () => {
  it('usa valores por defecto cuando se pasa objeto vacío', async () => {
    const dto = plainToInstance(ListClientesDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('acepta valores válidos de page y limit', async () => {
    const dto = plainToInstance(ListClientesDto, { page: 3, limit: 50 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(50);
  });

  it('acepta vendedor_id UUID válido', async () => {
    const dto = plainToInstance(ListClientesDto, {
      vendedor_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.vendedor_id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('acepta filtro search', async () => {
    const dto = plainToInstance(ListClientesDto, { search: 'Juan' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.search).toBe('Juan');
  });

  it('rechaza search demasiado largo', async () => {
    const dto = plainToInstance(ListClientesDto, {
      search: 'A'.repeat(101),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('search');
  });

  it('rechaza page como string no numérico', async () => {
    const dto = plainToInstance(ListClientesDto, { page: 'abc' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('page');
  });

  it('rechaza page menor a 1', async () => {
    const dto = plainToInstance(ListClientesDto, { page: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('page');
  });

  it('rechaza limit mayor a 100', async () => {
    const dto = plainToInstance(ListClientesDto, { limit: 101 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('limit');
  });

  it('rechaza vendedor_id con UUID inválido', async () => {
    const dto = plainToInstance(ListClientesDto, {
      vendedor_id: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('vendedor_id');
  });
});

// ─── UpdateClienteDto ───

describe('UpdateClienteDto', () => {
  it('acepta objeto vacío (todos opcionales)', async () => {
    const dto = plainToInstance(UpdateClienteDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('acepta todos los campos válidos', async () => {
    const dto = plainToInstance(UpdateClienteDto, {
      nombre: 'Juan',
      apellido: 'Pérez',
      dni: '12345678',
      telefono: '11-5555-0100',
      tipoFactura: TipoFactura.B,
      direccionCalle: 'Av. Siempre Viva',
      direccionNumero: '742',
      direccionPiso: '3',
      direccionReferencia: 'Frente a la plaza',
      direccionBarrio: 'Centro',
      direccionCiudad: 'CABA',
      direccionProvincia: 'CABA',
      direccionCp: '1000',
      latitud: -34.6037,
      longitud: -58.3816,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.nombre).toBe('Juan');
    expect(dto.apellido).toBe('Pérez');
    expect(dto.dni).toBe('12345678');
    expect(dto.telefono).toBe('11-5555-0100');
    expect(dto.tipoFactura).toBe(TipoFactura.B);
    expect(dto.direccionCalle).toBe('Av. Siempre Viva');
    expect(dto.latitud).toBe(-34.6037);
    expect(dto.longitud).toBe(-58.3816);
  });

  it('acepta actualización parcial (solo nombre)', async () => {
    const dto = plainToInstance(UpdateClienteDto, {
      nombre: 'Carlos',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.nombre).toBe('Carlos');
    expect(dto.apellido).toBeUndefined();
    expect(dto.dni).toBeUndefined();
  });

  it('rechaza tipoFactura inválido', async () => {
    const dto = plainToInstance(UpdateClienteDto, {
      tipoFactura: 'X',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('tipoFactura');
  });

  it('rechaza dni demasiado largo', async () => {
    const dto = plainToInstance(UpdateClienteDto, {
      dni: '1'.repeat(21),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('dni');
  });

  it('rechaza latitud no numérica', async () => {
    const dto = plainToInstance(UpdateClienteDto, {
      latitud: 'not-a-number',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('latitud');
  });
});

// ─── UpdateClienteVendedorDto ───

describe('UpdateClienteVendedorDto', () => {
  it('acepta objeto vacío (todos opcionales)', async () => {
    const dto = plainToInstance(UpdateClienteVendedorDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('acepta todos los campos válidos', async () => {
    const dto = plainToInstance(UpdateClienteVendedorDto, {
      nombre: 'Ana',
      apellido: 'García',
      telefono: '11-5555-0200',
      direccionCalle: 'Av. Corrientes',
      direccionNumero: '1234',
      direccionPiso: '5B',
      direccionReferencia: 'Galería',
      direccionBarrio: 'Recoleta',
      direccionCiudad: 'CABA',
      direccionProvincia: 'CABA',
      direccionCp: '1425',
      latitud: -34.5877,
      longitud: -58.3928,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.nombre).toBe('Ana');
    expect(dto.apellido).toBe('García');
    expect(dto.telefono).toBe('11-5555-0200');
    expect(dto.direccionCalle).toBe('Av. Corrientes');
    expect(dto.latitud).toBe(-34.5877);
  });

  it('NO tiene campo tipoFactura', async () => {
    const dto = plainToInstance(UpdateClienteVendedorDto, {});
    expect((dto as any).tipoFactura).toBeUndefined();
  });

  it('NO tiene campo dni', async () => {
    const dto = plainToInstance(UpdateClienteVendedorDto, {});
    expect((dto as any).dni).toBeUndefined();
  });

  it('acepta actualización parcial (solo telefono)', async () => {
    const dto = plainToInstance(UpdateClienteVendedorDto, {
      telefono: '11-5555-0300',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.telefono).toBe('11-5555-0300');
    expect(dto.nombre).toBeUndefined();
  });

  it('rechaza latitud no numérica', async () => {
    const dto = plainToInstance(UpdateClienteVendedorDto, {
      latitud: 'xxx',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('latitud');
  });
});

// ─── ReasignarVendedorDto ───

describe('ReasignarVendedorDto', () => {
  it('acepta vendedorId UUID válido', async () => {
    const dto = plainToInstance(ReasignarVendedorDto, {
      vendedorId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.vendedorId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('rechaza si falta vendedorId', async () => {
    const dto = plainToInstance(ReasignarVendedorDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('vendedorId');
  });

  it('rechaza vendedorId con UUID inválido', async () => {
    const dto = plainToInstance(ReasignarVendedorDto, {
      vendedorId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].property).toBe('vendedorId');
  });
});
