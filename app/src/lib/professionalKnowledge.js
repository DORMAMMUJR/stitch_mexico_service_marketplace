/**
 * Base de conocimiento local por profesional.
 * Mientras un profesional no tenga VISO configurado en n8n,
 * el chat responde con esta información directamente desde el frontend.
 *
 * Para agregar un profesional nuevo:
 * 1. Agrega su entrada aquí con su nombre exacto como key.
 * 2. Rellena specialties, price, schedule y faqs.
 * 3. Cuando tenga n8n listo, pon visoEnabled: true y el chat
 *    empezará a usar el webhook automáticamente.
 */

export const PROFESSIONAL_KNOWLEDGE = {
  'Pamela Osnaya': {
    visoEnabled: true, // Usa el webhook de n8n
    name: 'Pamela Osnaya',
    title: 'Psicóloga Clínica',
    price: '$350 MXN por consulta',
    schedule: 'Lunes a Viernes, 9am – 7pm',
    location: 'Consulta en línea y presencial en CDMX',
    specialties: ['Terapia de pareja', 'Adolescentes', 'Terapia post-separación'],
    faqs: [
      { q: ['precio', 'costo', 'cuánto cobra', 'cuánto cuesta', 'tarifa'], a: 'La consulta con Pamela tiene un costo de $350 MXN. Se puede pagar por transferencia o en efectivo.' },
      { q: ['pareja', 'relación', 'matrimonio'], a: 'Sí, Pamela se especializa en terapia de pareja. Trabaja conflictos de comunicación, crisis y reconstrucción del vínculo.' },
      { q: ['adolescente', 'joven', 'hijo', 'hija', 'teen'], a: 'Pamela trabaja con adolescentes de 12 a 18 años, abordando ansiedad, identidad, relaciones y presión escolar.' },
      { q: ['separación', 'divorcio', 'ruptura'], a: 'Sí, la terapia post-separación es una de sus especialidades. Ayuda a procesar el duelo, restructurar la vida y recuperar la estabilidad emocional.' },
      { q: ['cita', 'agendar', 'reservar', 'horario', 'disponible'], a: 'Puedes agendar una cita de Lunes a Viernes entre 9am y 7pm. ¿Te gustaría que te contacte para confirmar fecha y hora?' },
      { q: ['online', 'en línea', 'virtual', 'videollamada', 'zoom'], a: 'Sí, Pamela ofrece consultas en línea por videollamada. Funciona igual de efectivo que la presencial.' },
    ],
    greeting: '¡Hola! Soy el asistente de Pamela Osnaya, Psicóloga Clínica especializada en terapia de pareja, adolescentes y post-separación. ¿En qué puedo ayudarte?',
  },

  // ─── Agrega aquí más profesionales ───────────────────────────────────────

  'Roberto Méndez': {
    visoEnabled: false, // Usa respuestas locales por ahora
    name: 'Roberto Méndez',
    title: 'Plomero Certificado',
    price: 'Desde $350 MXN por servicio',
    schedule: 'Lunes a Sábado, 8am – 6pm',
    location: 'Zapopan y área metropolitana de Guadalajara',
    specialties: ['Sistemas hidroneumáticos', 'Reparación de fugas', 'Instalaciones nuevas'],
    faqs: [
      { q: ['precio', 'costo', 'cuánto cobra', 'tarifa'], a: 'Los servicios de Roberto inician desde $350 MXN. El costo final depende del trabajo específico. Puede darte un presupuesto sin costo.' },
      { q: ['urgente', 'emergencia', 'fuga', 'urgencia'], a: 'Roberto atiende emergencias. Contáctalo directamente para una respuesta inmediata en el área de Zapopan.' },
      { q: ['cita', 'agendar', 'disponible', 'horario'], a: 'Roberto atiende de Lunes a Sábado de 8am a 6pm. ¿Deseas que te contactemos para coordinar una visita?' },
      { q: ['garantía', 'garantia'], a: 'Todos los trabajos de Roberto incluyen garantía. Pregúntale los detalles según el tipo de servicio.' },
    ],
    greeting: 'Hola, soy el asistente de Roberto Méndez, Plomero Certificado con 8 años de experiencia. ¿En qué te puedo ayudar?',
  },

  'Lucía Gutiérrez': {
    visoEnabled: false,
    name: 'Lucía Gutiérrez',
    title: 'Instalaciones Sanitarias',
    price: 'Desde $300 MXN',
    schedule: 'Lunes a Viernes, 9am – 5pm',
    location: 'Guadalajara',
    specialties: ['Remodelación de baños', 'Cocinas', 'Instalaciones sanitarias'],
    faqs: [
      { q: ['precio', 'costo', 'cuánto', 'tarifa'], a: 'Los servicios de Lucía inician desde $300 MXN. Te puede dar un presupuesto personalizado sin compromiso.' },
      { q: ['baño', 'cocina', 'remodelación'], a: 'Lucía se especializa en remodelaciones de baños y cocinas con trabajo garantizado.' },
      { q: ['cita', 'agendar', 'horario'], a: 'Atiende de Lunes a Viernes de 9am a 5pm. ¿Quieres que te contactemos?' },
    ],
    greeting: 'Hola, soy el asistente de Lucía Gutiérrez, especialista en instalaciones sanitarias. ¿En qué te puedo ayudar?',
  },
};

/**
 * Responde a un mensaje usando la base de conocimiento local.
 * Busca keywords del mensaje contra las preguntas frecuentes.
 */
export function getLocalResponse(professionalName, userMessage) {
  const knowledge = PROFESSIONAL_KNOWLEDGE[professionalName];

  if (!knowledge) {
    return `Hola, soy el asistente de ${professionalName}. Para más información o agendar una cita, nuestro equipo te contactará pronto. ¿En qué puedo ayudarte?`;
  }

  const msg = userMessage.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Buscar coincidencia en FAQs
  for (const faq of knowledge.faqs) {
    if (faq.q.some(keyword => msg.includes(keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
      return faq.a;
    }
  }

  // Respuesta genérica con datos del profesional
  return `Puedo ayudarte con información sobre ${knowledge.name} (${knowledge.title}).\n\n📋 **Especialidades:** ${knowledge.specialties.join(', ')}\n💰 **Precio:** ${knowledge.price}\n🕐 **Horario:** ${knowledge.schedule}\n\n¿Tienes alguna pregunta específica sobre sus servicios o quieres agendar una cita?`;
}

/**
 * Devuelve el mensaje de bienvenida para un profesional.
 */
export function getGreeting(professionalName) {
  const knowledge = PROFESSIONAL_KNOWLEDGE[professionalName];
  if (knowledge?.greeting) return knowledge.greeting;
  return `Hola. Soy el asistente de ${professionalName || 'este profesional'}. ¿En qué puedo ayudarte hoy?`;
}

/**
 * Determina si un profesional tiene VISO/n8n activo.
 */
export function hasVisoEnabled(professionalName) {
  return PROFESSIONAL_KNOWLEDGE[professionalName]?.visoEnabled === true;
}
