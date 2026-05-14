export type MedicalSpecialtyKey =
  | 'MEDICINA_GENERAL'
  | 'PEDIATRIA'
  | 'GINECOLOGIA'
  | 'TRAUMATOLOGIA'
  | 'ORTOPEDIA'
  | 'DERMATOLOGIA'
  | 'PSIQUIATRIA'
  | 'PSICOLOGIA'
  | 'CARDIOLOGIA'
  | 'ODONTOLOGIA'
  | 'NUTRICION'
  | 'MEDICINA_INTERNA';

type SymptomRule = {
  specialty: MedicalSpecialtyKey;
  terms: string[];
};

const SYMPTOM_RULES: SymptomRule[] = [
  { specialty: 'TRAUMATOLOGIA', terms: ['dolor de espalda', 'lesion muscular', 'esguince', 'dolor articular'] },
  { specialty: 'ORTOPEDIA', terms: ['fractura', 'rodilla', 'hombro', 'columna'] },
  { specialty: 'CARDIOLOGIA', terms: ['palpitaciones', 'presion alta', 'dolor de pecho', 'taquicardia'] },
  { specialty: 'GINECOLOGIA', terms: ['menstruacion', 'embarazo', 'dolor pelvico', 'control prenatal'] },
  { specialty: 'PEDIATRIA', terms: ['fiebre infantil', 'tos infantil', 'recien nacido', 'vacunas'] },
  { specialty: 'DERMATOLOGIA', terms: ['acne', 'manchas en piel', 'dermatitis', 'rash'] },
  { specialty: 'PSIQUIATRIA', terms: ['ansiedad severa', 'depresion', 'ataques de panico', 'insomnio'] },
  { specialty: 'PSICOLOGIA', terms: ['ansiedad', 'terapia', 'duelo', 'estres'] },
  { specialty: 'ODONTOLOGIA', terms: ['dolor de muela', 'caries', 'endodoncia', 'brackets'] },
  { specialty: 'NUTRICION', terms: ['bajar de peso', 'nutricion', 'dieta', 'resistencia a la insulina'] },
  { specialty: 'MEDICINA_INTERNA', terms: ['diabetes', 'hipertension', 'fatiga cronica', 'control metabolico'] },
  { specialty: 'MEDICINA_GENERAL', terms: ['consulta general', 'malestar general', 'revision medica', 'chequeo'] },
];

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function resolveSymptomToSpecialty(input: string): MedicalSpecialtyKey | null {
  const normalizedInput = normalize(input);
  if (!normalizedInput) return null;

  for (const rule of SYMPTOM_RULES) {
    const matched = rule.terms.some((term) => normalizedInput.includes(normalize(term)));
    if (matched) return rule.specialty;
  }

  return null;
}

