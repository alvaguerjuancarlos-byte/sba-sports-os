import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">SBA Sports OS</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Login de desarrollo — elige una persona sembrada por <code>scripts/seed-dev.mjs</code>. Se reemplaza por un
          proveedor de identidad real más adelante.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
