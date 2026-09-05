import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { MfaRequiredGuard } from './mfa-required.guard.js';

@Module({
  // PassportModule.register(...) es obligatorio, no cosmético: sin él, PassportModule no provee
  // el token AuthModuleOptions y AuthGuard('jwt') (JwtAuthGuard) falla al arrancar con
  // "UnknownDependenciesException: can't resolve dependencies of JwtAuthGuard" — un bare
  // `imports: [PassportModule]` compila y pasa todos los tests unitarios (que mockean el guard),
  // pero solo se descubre arrancando la app de verdad contra Nest real.
  //
  // Además, PassportModule debe estar en `exports` (no solo en `imports`): cuando un controller
  // usa `@UseGuards(JwtAuthGuard)` por referencia de clase, Nest instancia el guard en el contexto
  // del módulo que lo consume (ej. IdentityAccessModule), no reutiliza la instancia de AuthModule
  // — así que AuthModuleOptions también debe ser visible ahí. Re-exportar el módulo configurado
  // (mismo patrón que "re-exporting modules" de los docs de Nest) resuelve esto para cualquier
  // módulo que importe AuthModule, sin tener que registrar Passport de nuevo en cada uno.
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard, MfaRequiredGuard],
  exports: [PassportModule, JwtAuthGuard, RolesGuard, MfaRequiredGuard],
})
export class AuthModule {}
