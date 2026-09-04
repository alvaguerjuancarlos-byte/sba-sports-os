// Parser/generador CSV mínimo (RFC 4180: campos entre comillas, comillas escapadas como "") — sin
// dependencia externa. UC-CFG-03 solo pide CSV/Excel; aquí se cubre CSV — Excel (.xlsx binario)
// queda fuera de este "mínimo viable" (RFP §5 lo menciona pero no hay caso de uso que exija el
// formato binario específico, y añadir un parser de xlsx es una dependencia nueva no decidida).

export function parsearCsv(texto: string): Record<string, string>[] {
  const filas = dividirEnFilas(texto);
  if (filas.length === 0) return [];
  const encabezados = filas[0];
  return filas
    .slice(1)
    .filter((fila) => fila.length > 1 || fila[0] !== '')
    .map((fila) => Object.fromEntries(encabezados.map((h, i) => [h, fila[i] ?? ''])));
}

function dividirEnFilas(textoOriginal: string): string[][] {
  const texto = textoOriginal.replace(/\r\n/g, '\n');
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let dentroDeComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroDeComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeComillas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroDeComillas = true;
    } else if (c === ',') {
      fila.push(campo);
      campo = '';
    } else if (c === '\n') {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  fila.push(campo);
  filas.push(fila);
  return filas;
}

export function generarCsv(encabezados: string[], filas: Record<string, unknown>[]): string {
  const escapar = (valor: unknown): string => {
    const texto = valor === null || valor === undefined ? '' : String(valor);
    return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const lineas = [encabezados.join(',')];
  for (const fila of filas) {
    lineas.push(encabezados.map((h) => escapar(fila[h])).join(','));
  }
  return lineas.join('\n');
}
