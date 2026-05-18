# RUNBOOK_GO_LIVE_SEENODE.md

## Release Blockers (obligatorio)
- Validacion legal-contable formal (fiscal/comprobantes) aprobada por responsable.
- GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET y GOOGLE_OAUTH_REDIRECT_URI configurados en staging/prod.
- STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET configurados y validados.
- KYC activo: profesional no aprobado no puede cobrar con tarjeta.

## Entornos
- Servicio 1: Frontend (SEENODE App)
- Servicio 2: Backend API Node (SEENODE API)
- PostgreSQL gestionado con backup automatico y prueba de restore.

## Variables criticas
- JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, JWT_ACCESS_EXPIRY
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_CONNECT_CLIENT_ID
- GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI
- DATABASE_URL, APP_URL, ALLOWED_ORIGINS, SENTRY_DSN
- TRUST_PROXY_HOPS

## Flujo de rollback
1. Pausar trafico al API (o drenar instancias).
2. Restaurar release anterior de backend y frontend.
3. Verificar /health, /api/auth/me y webhook Stripe.
4. Si hubo migraciones productivas, restaurar snapshot DB validado.

## Monitoreo minimo de salida
- Exito login Google (% ok / total intentos).
- Exito checkout Stripe (% sesiones creadas y completadas).
- Error rate y latencia de /api/webhooks/stripe.
- Tasa 401/403 en /api/auth/* y /api/appointments/checkout.
- Alertas Sentry activas por errores de auth/pago.
