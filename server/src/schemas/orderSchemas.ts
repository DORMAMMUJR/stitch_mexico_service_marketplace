import { z } from 'zod';

export const createOrderSchema = z.object({
  professionalId: z.string().cuid('professionalId inválido'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres').max(1000),
  agreedPrice: z.number().positive('El precio debe ser mayor a 0').max(1000000),
  currency: z.enum(['MXN', 'USD']).default('MXN'),
});

export const disputeOrderSchema = z.object({
  reason: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(500),
});

export const resolveDisputeSchema = z.object({
  resolution: z.enum(['FAVOR_CLIENT', 'FAVOR_PROFESSIONAL', 'PARTIAL_REFUND', 'TIMEOUT_RELEASE']),
});
