# Runbook KonectIA: Staging + Produccion

## 1) Secretos y configuracion

### Variables requeridas
- `DATABASE_URL`
- `SHADOW_DATABASE_URL`
- `STRIPE_WEBHOOK_SECRET`
- `BANK_TRANSFER_WEBHOOK_SECRET`
- `JWT_PRIVATE_KEY`

> En produccion el backend ahora falla en arranque si faltan `STRIPE_WEBHOOK_SECRET` o `BANK_TRANSFER_WEBHOOK_SECRET`.

### Verificacion rapida
1. Cargar secretos en secret manager del entorno.
2. Reiniciar backend.
3. Confirmar `GET /health` devuelve `200`.

## 2) Baseline y migraciones Prisma

### Archivos versionados
- `server/prisma/migrations/20260514000000_baseline/migration.sql`
- `server/prisma/migrations/20260514001000_review_appointment_verified/migration.sql`

### Primera vez en una BD existente (baseline)
Desde la raiz del repo:

```powershell
npm run migrate:resolve:baseline --workspace=server
npm run migrate:deploy --workspace=server
npm run migrate:status --workspace=server
```

### Verificacion de integridad (evidencia)
```powershell
./server/scripts/ops/migration-checksums.ps1
```
Guardar salida de:
- checksum SHA256 de ambas migraciones
- salida completa de `migrate deploy`
- salida de `migrate status`

## 3) Webhook bancario (adaptador propio)

El endpoint canonico se mantiene:
- `POST /api/webhooks/bank-transfer`
- Header obligatorio: `x-webhook-signature`

El backend adapta payloads nativos de proveedor al DTO interno:
`{ appointmentId, transferReference, amount, currency, paidAt, providerTxId, status }`

### Pruebas manuales
Reemplazar `REPLACE_APPOINTMENT_ID` en payloads.

```powershell
./server/scripts/ops/invoke-bank-webhook.ps1 -Url "https://<host>/api/webhooks/bank-transfer" -Secret "<BANK_TRANSFER_WEBHOOK_SECRET>" -BodyFile "server/scripts/ops/payloads/bank-transfer-canonical-paid.json"
```

Payload nativo proveedor:
```powershell
./server/scripts/ops/invoke-bank-webhook.ps1 -Url "https://<host>/api/webhooks/bank-transfer" -Secret "<BANK_TRANSFER_WEBHOOK_SECRET>" -BodyFile "server/scripts/ops/payloads/bank-transfer-provider-paid.json"
```

Firma invalida:
```powershell
./server/scripts/ops/invoke-bank-webhook.ps1 -Url "https://<host>/api/webhooks/bank-transfer" -Secret "<BANK_TRANSFER_WEBHOOK_SECRET>" -BodyFile "server/scripts/ops/payloads/bank-transfer-canonical-paid.json" -InvalidSignature
```

## 4) Plan E2E en staging

### Reseñas verificadas
- `GET /api/professionals/:id/review-eligibility`:
  - `canReview=true` con cita `COMPLETED` del cliente.
  - `canReview=false` sin cita, cita ajena o ya resenada.
- `POST /api/professionals/:id/reviews`:
  - `201` solo con cita `COMPLETED` propia.
  - `400/403/409` en casos no elegibles y duplicado.

### Webhook transferencia
- Firma invalida -> `401`.
- Referencia/monto/moneda invalida -> `400`.
- Cita inexistente -> `404`.
- Evento repetido -> `idempotent=true` sin nueva mutacion.
- Evento valido -> `PENDING_PAYMENT -> SCHEDULED` + auditoria/notificaciones.

### Stripe
- Confirmar webhook Stripe sigue operando en pago exitoso y conflicto de slot.

### Uploads
- Avatar y portafolio:
  - local: `/uploads/public/...`
  - S3: `file.location`

### Superadmin
- `GET /api/admin/stats` renderiza KPIs esperados.
- Gestion de usuarios/roles funcional con feedback en UI.

## 5) Deploy a produccion + smoke

1. Deploy backend + frontend.
2. Ejecutar:
   - `GET /health`
   - Login
   - Home/Directorio/Perfil
   - Dashboard cliente/profesional
   - Admin
   - Flujo pago tarjeta y transferencia
3. Registrar evidencia final (fecha/hora, entorno, commit, resultados).

## 6) Rollback rapido

- Aplicacion: revertir a release anterior.
- Secretos: restaurar version anterior en secret manager y reiniciar.
- DB: no editar manualmente fuera de migraciones; si hay incidente de migracion usar `prisma migrate resolve` + script SQL controlado.
