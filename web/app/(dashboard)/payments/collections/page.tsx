import { RemindersButton } from './reminders-button';

export default function CollectionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Cobranza (UC-PAY-06)</h2>
        <p className="text-sm text-neutral-500">
          En producción esto lo dispara un scheduler, no un admin a mano — aquí se expone el disparo manual mientras no exista esa infraestructura.
        </p>
      </div>
      <RemindersButton />
    </div>
  );
}
