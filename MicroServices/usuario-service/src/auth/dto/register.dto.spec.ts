import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

const validRegisterPayload = {
  email: 'vendedor@test.com',
  emailConfirmation: 'vendedor@test.com',
  password: 'password123',
  nombre: 'Vendedor',
  apellido: 'Test',
  dni: '12345678',
  telefono: '11-5555-0199',
  ciudad: 'Capital Federal',
};

describe('RegisterDto', () => {
  it('acepta DNI con exactamente 8 dígitos numéricos', async () => {
    const dto = plainToInstance(RegisterDto, validRegisterPayload);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it.each([
    ['letters', 'abcdefgh'],
    ['spaces', '        '],
    ['symbols', '12.34567'],
    ['short length', '1234567'],
    ['long length', '123456789'],
  ])('rechaza DNI con %s', async (_caseName, dni) => {
    const dto = plainToInstance(RegisterDto, { ...validRegisterPayload, dni });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'dni' }),
      ]),
    );
  });
});
