import { redirect } from 'next/navigation';
import { obtenerSesion } from '@/lib/session';

export default async function RootPage() {
  const sesion = await obtenerSesion();
  redirect(sesion ? '/identity' : '/login');
}
