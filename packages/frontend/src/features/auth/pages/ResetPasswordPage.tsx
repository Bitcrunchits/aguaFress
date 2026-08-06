import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../../services/api';
import AuthLayout from '../../../shared/Layout/AuthLayout';

const resetSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z
      .string()
      .min(1, 'Confirmá la contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetFormValues) => {
    if (!token) {
      setServerError('Token de recuperación no válido o faltante.');
      return;
    }

    setServerError(null);

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });
      setSuccess(true);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Error al restablecer la contraseña.';
      setServerError(message);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="AguaFress" subtitle="Link inválido">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="rounded-md bg-red-50 p-4 text-sm text-error">
            El link de recuperación no es válido o está incompleto.
          </div>
          <Link
            to="/login"
            className="inline-block text-sm text-brand-teal hover:text-brand-teal/80 hover:underline"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout title="AguaFress" subtitle="Contraseña actualizada">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="rounded-md bg-green-50 p-4 text-sm text-success">
            Tu contraseña se actualizó correctamente. Ya podés iniciar sesión
            con tu nueva contraseña.
          </div>
          <Link
            to="/login"
            className="inline-block rounded-md bg-brand-teal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-teal/90"
          >
            Iniciar sesión
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="AguaFress" subtitle="Nueva contraseña">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-6"
        noValidate
      >
        <p className="text-sm text-text-secondary">
          Ingresá tu nueva contraseña.
        </p>

        <div className="space-y-1">
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-text-primary"
          >
            Nueva contraseña
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            {...register('newPassword')}
            className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors
              ${
                errors.newPassword
                  ? 'border-error focus:border-error'
                  : 'border-gray-300 focus:border-brand-teal'
              }`}
            placeholder="••••••••"
          />
          {errors.newPassword && (
            <p className="text-xs text-error">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-text-primary"
          >
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors
              ${
                errors.confirmPassword
                  ? 'border-error focus:border-error'
                  : 'border-gray-300 focus:border-brand-teal'
              }`}
            placeholder="••••••••"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-error">
              {errors.confirmPassword.message}
            </p>
          )}
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
          {isSubmitting ? 'Guardando...' : 'Restablecer contraseña'}
        </button>

        <div className="text-center">
          <Link
            to="/login"
            className="text-xs text-text-secondary hover:text-brand-teal hover:underline"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
