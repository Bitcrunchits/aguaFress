import { registerDecorator, type ValidationArguments, type ValidationOptions } from 'class-validator';

const PRODUCT_UPLOAD_PATH_PATTERN = /^products\/[A-Za-z0-9_-]+\.webp$/;

export function IsProductImageReference(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isProductImageReference',
      target: target.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          if (PRODUCT_UPLOAD_PATH_PATTERN.test(value)) return true;

          try {
            const url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a valid http(s) URL or products/<safe-file>.webp`;
        },
      },
    });
  };
}
