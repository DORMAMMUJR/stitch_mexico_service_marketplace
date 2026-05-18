const DEFAULT_CANCELLATION_WINDOW_HOURS = 24;

export function evaluateCancellationPolicy(scheduledAt?: Date | null, now = new Date()) {
  if (!scheduledAt) {
    return {
      allowed: true,
      policyViolation: false,
      hoursBeforeAppointment: null,
      minimumHours: DEFAULT_CANCELLATION_WINDOW_HOURS,
    };
  }

  const hoursBeforeAppointment = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  const policyViolation = hoursBeforeAppointment < DEFAULT_CANCELLATION_WINDOW_HOURS;

  return {
    allowed: true,
    policyViolation,
    hoursBeforeAppointment,
    minimumHours: DEFAULT_CANCELLATION_WINDOW_HOURS,
  };
}
