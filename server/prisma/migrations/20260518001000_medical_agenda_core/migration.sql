-- Medical agenda core: compatible expansion for serious appointment scheduling.
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'REQUESTED';
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';

CREATE TYPE "AvailabilityOverrideType" AS ENUM ('BLOCK', 'EXTRA_AVAILABLE');
CREATE TYPE "AppointmentEventType" AS ENUM (
  'REQUESTED',
  'CONFIRMED',
  'RESCHEDULE_REQUESTED',
  'RESCHEDULED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
  'REMINDER_SENT'
);
CREATE TYPE "ReminderChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');
CREATE TYPE "ReminderJobStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "AvailabilityRule" (
  "id" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AvailabilityRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AvailabilityOverride" (
  "id" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "type" "AvailabilityOverrideType" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AvailabilityOverride_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentEvent" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" "AppointmentEventType" NOT NULL,
  "fromStatus" "AppointmentStatus",
  "toStatus" "AppointmentStatus",
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppointmentEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReminderJob" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "channel" "ReminderChannel" NOT NULL,
  "status" "ReminderJobStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReminderJob_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AvailabilityRule" ("id", "professionalId", "dayOfWeek", "startTime", "endTime", "isActive", "createdAt", "updatedAt")
SELECT "id", "professionalId", "dayOfWeek", "startTime", "endTime", true, "createdAt", "updatedAt"
FROM "Availability"
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "AvailabilityRule_professionalId_dayOfWeek_key" ON "AvailabilityRule"("professionalId", "dayOfWeek");
CREATE INDEX "AvailabilityRule_professionalId_dayOfWeek_idx" ON "AvailabilityRule"("professionalId", "dayOfWeek");
CREATE INDEX "AvailabilityOverride_professionalId_date_idx" ON "AvailabilityOverride"("professionalId", "date");
CREATE INDEX "AppointmentEvent_appointmentId_createdAt_idx" ON "AppointmentEvent"("appointmentId", "createdAt");
CREATE INDEX "AppointmentEvent_actorUserId_createdAt_idx" ON "AppointmentEvent"("actorUserId", "createdAt");
CREATE INDEX "ReminderJob_status_scheduledFor_idx" ON "ReminderJob"("status", "scheduledFor");
CREATE INDEX "ReminderJob_appointmentId_idx" ON "ReminderJob"("appointmentId");

ALTER TABLE "AvailabilityRule"
  ADD CONSTRAINT "AvailabilityRule_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AvailabilityOverride"
  ADD CONSTRAINT "AvailabilityOverride_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentEvent"
  ADD CONSTRAINT "AppointmentEvent_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReminderJob"
  ADD CONSTRAINT "ReminderJob_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
