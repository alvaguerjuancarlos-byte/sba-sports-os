import { Module } from '@nestjs/common';
import { AuditLogModule } from '../shared/audit-log/audit-log.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { InventoryItemService } from './inventory-item.service.js';
import { InventoryItemController } from './inventory-item.controller.js';
import { InventoryCheckoutService } from './inventory-checkout.service.js';
import { InventoryCheckoutController } from './inventory-checkout.controller.js';

// A diferencia de Sports Hub/Calendar/Attendance, este dominio NO importa CalendarRsvpModule —
// inventory_item.venue_id es una FK a nivel de base de datos (existencia validada por violación
// de FK), nunca una llamada a VenueService (mismo patrón que budget_line → financial_dimension en
// Admin Hub).
@Module({
  imports: [AuditLogModule, AuthModule],
  controllers: [InventoryItemController, InventoryCheckoutController],
  providers: [InventoryItemService, InventoryCheckoutService],
  exports: [InventoryItemService, InventoryCheckoutService],
})
export class FacilitiesInventoryModule {}
