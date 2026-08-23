import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LoginRequest } from '@agua/contracts';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Ingresá un email válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit: (data: LoginRequest) => Promise<void>;
  serverError?: string | null;
}

export default function LoginForm({ onSubmit, serverError }: LoginFormProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-6" noValidate>
      <div className="space-y-1">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-text-primary"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors
            ${
              errors.email
                ? 'border-error focus:border-error'
                : 'border-gray-300 focus:border-brand-teal'
            }`}
          placeholder="tu@email.com"
        />
        {errors.email && (
          <p className="text-xs text-error">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-text-primary"
        >
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            type={isPasswordVisible ? 'text' : 'password'}
            autoComplete="current-password"
            {...register('password')}
            className={`w-full rounded-md border px-3 py-2 pr-20 text-sm outline-none transition-colors
              ${
                errors.password
                  ? 'border-error focus:border-error'
                  : 'border-gray-300 focus:border-brand-teal'
              }`}
            placeholder="••••••••"
          />
          <button
            type="button"
            aria-label={
              isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
            aria-pressed={isPasswordVisible}
            onClick={() => setIsPasswordVisible((current) => !current)}
            className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-brand-teal hover:text-brand-teal/80"
          >
            {isPasswordVisible ? 'Ocultar' : 'Ver'}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-error">{errors.password.message}</p>
        )}
        <div className="mt-1 text-right">
          <Link
            to="/forgot-password"
            className="text-xs text-brand-teal hover:text-brand-teal/80 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-error"
        >
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-brand-teal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
      </button>
    </form>
  );
}
