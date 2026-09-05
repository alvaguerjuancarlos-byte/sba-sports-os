import { NewUserForm } from './new-user-form';

export default function NewUserPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-900">Dar de alta un usuario (UC-ID-01)</h2>
      <NewUserForm />
    </div>
  );
}
