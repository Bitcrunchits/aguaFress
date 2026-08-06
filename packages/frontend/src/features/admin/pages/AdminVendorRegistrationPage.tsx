import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { normalizeApiError } from '../../../shared/api-error';
import { registerAdminVendor } from '../services/admin-vendors.service';

interface RegistrationFormState {
  nombre: string;
  email: string;
  password: string;
}

const INITIAL_STATE: RegistrationFormState = {
  nombre: '',
  email: '',
  password: '',
};

export default function AdminVendorRegistrationPage() {
  const [formState, setFormState] = useState<RegistrationFormState>(INITIAL_STATE);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const nombre = formState.nombre.trim();
    const email = formState.email.trim();
    const password = formState.password;

    if (!nombre || !email || !password) {
      setFormError('Completá nombre, email y contraseña.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerAdminVendor({ nombre, email, password });
      setRegisteredEmail(email);
      setFormState(INITIAL_STATE);
    } catch (error) {
      const apiError = normalizeApiError(error, 'No se pudo registrar el vendedor');
      setFormError(apiError.message);
      // Preserve non-sensitive values for correction; clear only the password.
      setFormState((previous) => ({ ...previous, nombre, email, password: '' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registeredEmail) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Alta de vendedor</h1>
        <Card>
          <div className="space-y-3">
            <p className="text-sm text-text-primary">
              Vendedor <strong>{registeredEmail}</strong> registrado correctamente.
            </p>
            <p className="text-sm text-text-secondary">
              Queda en estado <strong>pendiente</strong> hasta que lo habilites desde el listado de pendientes.
            </p>
            <div className="flex gap-3">
              <Link to="/admin/vendors/pending">
                <Button type="button">Ver pendientes</Button>
              </Link>
              <Button type="button" onClick={() => setRegisteredEmail(null)}>
                Registrar otro
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Alta de vendedor</h1>
        <p className="text-sm text-text-secondary">
          Registra un vendedor nuevo. Queda pendiente hasta que verifiques su información y lo habilites.
        </p>
      </div>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text-primary">Nombre completo</span>
            <input
              aria-label="Nombre completo"
              value={formState.nombre}
              onChange={(event) => setFormState((previous) => ({ ...previous, nombre: event.target.value }))}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              placeholder="Nombre y apellido"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text-primary">Email</span>
            <input
              aria-label="Email"
              type="email"
              value={formState.email}
              onChange={(event) => setFormState((previous) => ({ ...previous, email: event.target.value }))}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              placeholder="vendedor@aguafress.com"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text-primary">Contraseña provisoria</span>
            <input
              aria-label="Contraseña provisoria"
              type="password"
              value={formState.password}
              onChange={(event) => setFormState((previous) => ({ ...previous, password: event.target.value }))}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              placeholder="La cambia en su primer ingreso"
            />
          </label>

          {formError && (
            <p role="alert" className="text-sm text-red-600">
              {formError}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando…' : 'Registrar vendedor'}
            </Button>
            <Link to="/admin/vendors">
              <Button type="button">Volver al listado</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
