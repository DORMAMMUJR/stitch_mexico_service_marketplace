# Runbook Operativo Diario — Flujo Integral

## 1. Inicio de turno (Admin)
1. Revisar `GET /api/admin/stats`.
2. Revisar verificación documental pendiente en `GET /api/admin/verifications/pending`.
3. Revisar disputas activas en `GET /api/orders/admin/disputes`.
4. Revisar cola de payout manual en `GET /api/admin/payouts/queue`.

## 2. Operación de citas y pagos
1. Revisar citas en `GET /api/admin/appointments/upcoming`.
2. Para transferencias pendientes:
   - Profesional/Admin confirma con `PATCH /api/appointments/:id/confirm-transfer`.
3. Para pagos con tarjeta:
   - Confirmación ocurre por webhook Stripe `/api/webhooks/stripe`.
4. Para conflictos de horario pagados:
   - Identificar `paymentState=SLOT_CONFLICT_REVIEW` y resolver manualmente.

## 3. Disputas y resolución financiera
1. Resolver disputa con `PATCH /api/orders/:id/resolve`.
2. Si resolución crea payout pendiente:
   - Completar payout manual: `PATCH /api/admin/payouts/:id/settle` `{ "action": "COMPLETE" }`.
   - Marcar fallo manual: `PATCH /api/admin/payouts/:id/settle` `{ "action": "FAIL", "reason": "..." }`.
   - Reintentar: `PATCH /api/admin/payouts/:id/settle` `{ "action": "RETRY" }`.

## 4. Auditoría operativa (timeline)
1. Citas: `GET /api/appointments/:id/events`.
2. Órdenes: `GET /api/orders/:id/timeline`.
3. Verificar que cada transición crítica tenga evento y timestamp.

## 5. Cierre de turno
1. Confirmar que no hay:
   - `PENDING_PAYMENT` sin seguimiento.
   - `EN_DISPUTA` sin acción.
   - `PAYOUT_INICIADO` / `PAYOUT_FALLIDO` sin responsable.
2. Registrar incidencias con ID de cita/orden y último evento de timeline.
