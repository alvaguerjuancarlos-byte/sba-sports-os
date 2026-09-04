import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { esJerarquiaValida, type DimensionType, type FinancialDimensionRow, type ProductCatalogRow } from './configuration-studio.types.js';

// Lógica de validación + insert compartida entre el alta individual (FinancialDimensionsService /
// ProductCatalogService) y la carga masiva (BulkImportService) — UC-CFG-03 exige que la
// importación "valide cada fila con las mismas reglas del alta individual", así que ambos caminos
// deben correr exactamente el mismo código, no una reimplementación paralela.

function esViolacionDeUnicidad(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
}

export interface CrearDimensionParams {
  organizationId: string;
  type: DimensionType;
  name: string;
  parentId?: string | null;
}

// UC-CFG-01, flujo principal.
export async function crearDimensionEnTransaccion(
  client: PoolClient,
  params: CrearDimensionParams,
): Promise<FinancialDimensionRow> {
  if (params.parentId) {
    const { rows } = await client.query<FinancialDimensionRow>(`select * from financial_dimension where id = $1`, [
      params.parentId,
    ]);
    const parent = rows[0];
    if (!parent) throw new NotFoundException('La dimensión padre indicada no existe.');
    // 2a. "el sistema rechaza la jerarquía inválida."
    if (!esJerarquiaValida(parent.type, params.type)) {
      throw new BadRequestException(
        `Jerarquía inválida: una dimensión de tipo '${parent.type}' no puede ser padre de una de tipo '${params.type}'.`,
      );
    }
  }

  try {
    const { rows } = await client.query<FinancialDimensionRow>(
      `insert into financial_dimension (organization_id, type, name, parent_id, status)
       values ($1, $2, $3, $4, 'active')
       returning *`,
      [params.organizationId, params.type, params.name, params.parentId ?? null],
    );
    return rows[0];
  } catch (e) {
    // 3. "El sistema valida que el nombre sea único dentro del mismo tipo y tenant."
    if (esViolacionDeUnicidad(e)) {
      throw new ConflictException(`Ya existe una dimensión de tipo '${params.type}' con el nombre '${params.name}'.`);
    }
    throw e;
  }
}

// UC-CFG-01, flujo alterno 4a — "el sistema no permite eliminarla, solo active = false (archivar)."
export async function archivarDimensionEnTransaccion(
  client: PoolClient,
  dimensionId: string,
): Promise<{ anterior: FinancialDimensionRow; actualizada: FinancialDimensionRow }> {
  const { rows } = await client.query<FinancialDimensionRow>(`select * from financial_dimension where id = $1`, [
    dimensionId,
  ]);
  const anterior = rows[0];
  if (!anterior) throw new NotFoundException('financial_dimension no encontrada.');

  const { rows: updated } = await client.query<FinancialDimensionRow>(
    `update financial_dimension set status = 'archived' where id = $1 returning *`,
    [dimensionId],
  );
  return { anterior, actualizada: updated[0] };
}

export interface CrearVersionProductoParams {
  organizationId: string;
  productKey?: string | null;
  name: string;
  price: string | number;
  financialDimensionId?: string | null;
  effectiveDate: string; // 'YYYY-MM-DD'
  attributes?: Record<string, unknown> | null;
}

// UC-CFG-02, flujo principal + alterno 1a. `productKey` ausente = primera versión de un producto
// nuevo; presente = nueva versión de precio de uno existente.
//
// [propuesto] — interpretación de "el sistema valida que no exista solapamiento de vigencia con
// una versión previa del mismo producto sin fecha de corte": el documento fuente no describe un
// caso de uso separado para "cerrar" una versión a mano, así que crear una versión nueva CIERRA
// automáticamente la anterior (effective_until = nueva effective_date) en vez de exigir que ya
// viniera cerrada — de lo contrario el flujo descrito no sería utilizable. Se valida que la nueva
// effective_date no retroceda respecto de la última versión, lo cual evita cualquier solapamiento.
export async function crearVersionProductoEnTransaccion(
  client: PoolClient,
  params: CrearVersionProductoParams,
): Promise<ProductCatalogRow> {
  const productKey = params.productKey ?? randomUUID();

  if (params.productKey) {
    const { rows } = await client.query<ProductCatalogRow>(
      `select * from product_catalog where product_key = $1 order by effective_date desc limit 1`,
      [params.productKey],
    );
    const ultimaVersion = rows[0];
    if (!ultimaVersion) {
      throw new NotFoundException(`No existe ningún producto con product_key ${params.productKey}.`);
    }
    if (params.effectiveDate <= ultimaVersion.effective_date) {
      throw new BadRequestException(
        'La nueva versión debe tener una effective_date posterior a la última versión existente — no se permite retroceder la vigencia.',
      );
    }
    if (ultimaVersion.effective_until === null) {
      await client.query(`update product_catalog set effective_until = $2 where id = $1`, [
        ultimaVersion.id,
        params.effectiveDate,
      ]);
    }
  }

  const { rows } = await client.query<ProductCatalogRow>(
    `insert into product_catalog
       (organization_id, product_key, name, attributes, price, financial_dimension_id, effective_date, effective_until, status)
     values ($1, $2, $3, $4, $5, $6, $7, null, 'active')
     returning *`,
    [
      params.organizationId,
      productKey,
      params.name,
      params.attributes ? JSON.stringify(params.attributes) : null,
      params.price,
      params.financialDimensionId ?? null,
      params.effectiveDate,
    ],
  );
  return rows[0];
}

// UC-CFG-02, flujo alterno 3a — "se archiva (mismo principio que UC-CFG-01), no se borra."
// Archiva TODAS las versiones del producto (mismo product_key): archivar es una operación sobre el
// producto, no sobre una versión de precio puntual.
export async function archivarProductoEnTransaccion(client: PoolClient, productKey: string): Promise<ProductCatalogRow[]> {
  const { rows } = await client.query<ProductCatalogRow>(`select * from product_catalog where product_key = $1`, [
    productKey,
  ]);
  if (rows.length === 0) throw new NotFoundException('No existe ningún producto con ese product_key.');

  const { rows: updated } = await client.query<ProductCatalogRow>(
    `update product_catalog set status = 'archived' where product_key = $1 returning *`,
    [productKey],
  );
  return updated;
}
