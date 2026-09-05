import Link from 'next/link';
import { redirect } from 'next/navigation';
import { obtenerSesion } from '@/lib/session';
import { LogoutButton } from './logout-button';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col gap-4 border-r border-neutral-200 p-4">
        <div>
          <h1 className="text-sm font-semibold text-neutral-900">SBA Sports OS</h1>
          <p className="text-xs text-neutral-500">{sesion.roles.join(', ')}</p>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          <p className="mt-2 px-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Identity & Access</p>
          <Link href="/identity" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Usuarios
          </Link>
          <Link href="/identity/guardian-consents" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Consentimientos pendientes
          </Link>
          <p className="mt-3 px-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Configuration Studio</p>
          <Link href="/config/financial-dimensions" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Dimensiones financieras
          </Link>
          <Link href="/config/product-catalog" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Catálogo de productos
          </Link>
          <Link href="/config/bulk-import" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Importar / exportar
          </Link>
          <Link href="/config/audit-log" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Auditoría
          </Link>
          <p className="mt-3 px-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Admin Hub</p>
          <Link href="/admin-hub/vendors" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Proveedores
          </Link>
          <Link href="/admin-hub/budget-lines" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Budget lines
          </Link>
          <Link href="/admin-hub/purchase-requests" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Solicitudes de compra
          </Link>
          <Link href="/admin-hub/purchase-orders" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Órdenes de compra
          </Link>
          <Link href="/admin-hub/actual-postings" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Gasto real
          </Link>
          <Link href="/admin-hub/budget-report" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Presupuesto vs. real
          </Link>
          <p className="mt-3 px-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Payments & Billing</p>
          <Link href="/payments/membership-plans" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Planes de membresía
          </Link>
          <Link href="/payments/invoices" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Facturas
          </Link>
          <Link href="/payments/transactions" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Pagos
          </Link>
          <Link href="/payments/accounts" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Cuentas y saldo
          </Link>
          <Link href="/payments/eligibility" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Elegibilidad
          </Link>
          <Link href="/payments/collections" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Cobranza
          </Link>
          <p className="mt-3 px-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Sports Hub</p>
          <Link href="/sports-hub/seasons" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Temporadas
          </Link>
          <Link href="/sports-hub/teams" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Equipos y roster
          </Link>
          <Link href="/sports-hub/league-cups" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Ligas y copas
          </Link>
          <p className="mt-3 px-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Calendar & RSVP</p>
          <Link href="/calendar" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Calendario
          </Link>
          <Link href="/calendar/venues" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Sedes
          </Link>
          <p className="mt-3 px-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Attendance/Real-Time</p>
          <Link href="/attendance/checkins" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Check-ins
          </Link>
          <Link href="/attendance/biometric-consent" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Consentimiento biométrico
          </Link>
          <p className="mt-3 px-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Facilities & Inventory</p>
          <Link href="/facilities/items" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Material
          </Link>
          <Link href="/facilities/checkouts" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Check-outs
          </Link>
          <Link href="/facilities/availability" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Disponibilidad
          </Link>
          <p className="mt-3 px-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Call-up Engine</p>
          <Link href="/callup-engine" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Convocatorias
          </Link>
          <Link href="/callup-engine/format-rules" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Reglas de formato
          </Link>
          <p className="mt-3 px-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Match Center</p>
          <Link href="/match-center" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Partidos
          </Link>
          <p className="mt-3 px-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Weekly Coach Feedback</p>
          <Link href="/weekly-feedback/capture" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Captura semanal
          </Link>
          <Link href="/weekly-feedback/history" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Histórico
          </Link>
          <Link href="/weekly-feedback/question-configs" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Preguntas por deporte
          </Link>
          <p className="mt-3 px-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Performance</p>
          <Link href="/performance/assessments" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Evaluaciones
          </Link>
          <Link href="/performance/development-maps" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Development Map
          </Link>
          <p className="mt-3 px-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Player Card</p>
          <Link href="/player-card" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Tarjetas
          </Link>
          <Link href="/player-card/media-consent" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Consentimiento de medios
          </Link>
          <Link href="/player-card/gallery" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Galería
          </Link>
        </nav>
        <LogoutButton />
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
