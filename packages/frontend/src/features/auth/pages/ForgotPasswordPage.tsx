import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AuthLayout from '../../../shared/Layout/AuthLayout';

const forgotSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Ingresá un email válido'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async () => {
    // El backend no tiene endpoint público de forgot-password aún.
    // Cuando lo tenga, conectar acá:
    //   await api.post('/auth/forgot-password', { email: data.email });
    setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout title="AguaFress" subtitle="Revisá tu email">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="rounded-md bg-green-50 p-4 text-sm text-success">
            Si el email está registrado, vas a recibir un link para restablecer
            tu contraseña.
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

  return (
    <AuthLayout title="AguaFress" subtitle="Recuperar contraseña">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-6"
        noValidate
      >
        <p className="text-sm text-text-secondary">
          Ingresá tu email y te enviaremos un link para restablecer tu
          contraseña.
        </p>

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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-brand-teal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar link'}
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
