import { Chat } from './chat';

export default function AgentPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Agente conversacional (UC-RPT-06)</h2>
        <p className="text-sm text-neutral-500">
          Enrutador determinista por palabra clave — respeta el mismo scope de permisos que la UI normal. Puede responder saldo/calendario, o proponer declinar una convocatoria (requiere
          confirmación explícita separada, nunca ejecuta directo).
        </p>
      </div>
      <Chat />
    </div>
  );
}
