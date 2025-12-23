
// Ajustado para strings minúsculas conforme padrão do seu banco de dados
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  PSYCHOLOGIST = 'profissional',
  SECRETARY = 'secretario'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'profissional' | 'secretario';
  avatar?: string;
}

// --- SUPER ADMIN TYPES ---
export interface Tenant {
  id: string;
  company_name: string;
  admin_name: string;
  admin_email: string;
  plan_type: string;
  status: 'active' | 'expired' | 'pending';
}

export interface GlobalResource {
  id: string;
  title: string;
  category: string;
  type: 'pdf' | 'doc' | 'image';
  size: string;
  date: string;
  public: boolean;
}
// -------------------------

export interface Professional {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpfCnpj?: string;
  profession: string;
  registrationNumber?: string;
  color: string;
  role: 'admin' | 'profissional' | 'secretario';
  commissionRate: number;
  hasAgenda: boolean;
  isThirdParty: boolean;
  active: boolean;
  avatarUrl?: string;
}

export enum MaritalStatus {
  SINGLE = 'Solteiro(a)',
  MARRIED = 'Casado(a)',
  DIVORCED = 'Divorciado(a)',
  WIDOWED = 'Viúvo(a)',
  COHABITING = 'Amaziado/União Estável',
  SEPARATED = 'Separado(a)'
}

export enum EducationLevel {
  PRIMARY_INC = 'Ensino Fundamental Incompleto',
  PRIMARY_COM = 'Ensino Fundamental Completo',
  SECONDARY_INC = 'Ensino Médio Incompleto',
  SECONDARY_COM = 'Ensino Médio Completo',
  HIGHER_INC = 'Ensino Superior Incompleto',
  HIGHER_COM = 'Ensino Superior Completo',
  POST_GRAD = 'Pós-graduação',
  MASTER = 'Mestrado',
  DOCTORATE = 'Doutorado'
}

export interface Patient {
  id: string;
  tenant_id: number;
  full_name: string;
  name?: string; // Compatibility alias
  email?: string;
  whatsapp?: string;
  phone?: string; // Compatibility alias
  cpf_cnpj?: string;
  cpf?: string; // Compatibility alias
  rg?: string;
  birth_date?: string;
  birthDate?: string; // Compatibility alias
  // Endereço (achatado conforme API)
  street?: string;
  house_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  address_zip?: string;
  country?: string;
  // Sociais
  marital_status?: MaritalStatus;
  education?: EducationLevel;
  profession?: string;
  nationality?: string;
  naturality?: string;
  // Familiar
  has_children: boolean;
  children_count?: number;
  minor_children_count?: number;
  spouse_name?: string;
  family_contact?: string;
  emergency_contact?: string;
  // Clínico/Financeiro
  status: 'ativo' | 'inativo';
  convenio: boolean;
  convenio_name?: string;
  needs_reimbursement: boolean;
  needsReimbursement?: boolean; // Compatibility alias
  psychologist_id?: string;
  photoUrl?: string;
  active?: boolean;
}

export type AppointmentType = 'consulta' | 'bloqueio' | 'pessoal';
export type AppointmentModality = 'online' | 'presencial';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'confirmed';

export interface Appointment {
  id: string;
  patient_id?: string;
  patient_name?: string;
  patient_name_text?: string;
  patientName?: string; // Compatibility alias
  psychologist_id?: string;
  psychologist_name?: string;
  professional_name_text?: string;
  psychologistName?: string; // Compatibility alias
  service_id?: string;
  service_name?: string;
  title: string;
  start: Date;
  end: Date;
  status: AppointmentStatus;
  type: AppointmentType;
  modality: AppointmentModality;
  meeting_url?: string;
  notes?: string;
  color?: string;
  duration_minutes?: number;
  recurrence_rule?: {
    freq: 'daily' | 'weekly' | 'monthly';
    interval: number;
    byWeekday?: string[];
  } | null;
  recurrence_end_date?: string | null;
  recurrence_count?: number | null;
  parent_appointment_id?: number | null;
  recurrence_index?: number | null;
}

// --- VIRTUAL ROOM API TYPES ---
export interface VirtualRoom {
  id: number;
  tenant_id: number;
  creator_user_id: number;
  code: string;
  title?: string;
  description?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  patient_id?: number;
  professional_id?: number;
  appointment_id?: number;
  provider?: 'jitsi' | 'zoom' | 'teams' | 'outro';
  link?: string;
  expiration_date?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentType = 'pix' | 'credit' | 'debit' | 'cash' | 'transfer' | 'check' | 'courtesy';

export interface Document {
  id: string;
  title: string;
  category: string;
  type: string;
  size: string;
  date: string;
}


export interface FormTheme {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardColor: string;
  buttonColor: string;
  headerImageUrl?: string;
}

export interface FormStats {
  totalForms: number;
  totalResponses: number;
  mostUsed: string | null;
}

export interface FormOption {
  label: string;
  value: number;
}

export type QuestionType = 'text' | 'textarea' | 'number' | 'radio' | 'checkbox' | 'select';

export interface FormQuestion {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options?: FormOption[];
}

export interface InterpretationRule {
  id: string;
  minScore: number;
  maxScore: number;
  resultTitle: string;
  description: string;
  color: string;
}

export interface ClinicalForm {
  id: string;
  title: string;
  hash: string;
  description?: string;
  questions: FormQuestion[];
  interpretations?: InterpretationRule[];
  responseCount: number;
  isGlobal?: boolean;
  theme?: FormTheme;
}

export interface ClinicalRecord {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  type: 'Evolução' | 'Anamnese' | 'Avaliação' | 'Encaminhamento';
  status: 'Rascunho' | 'Finalizado';
  title: string;
  preview: string;
  tags: string[];
}

export interface MessageTemplate {
  id: string;
  title: string;
  category: 'Lembrete' | 'Financeiro' | 'Aniversário' | 'Outros';
  content: string;
  lastUsed?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  cost: number;
  color: string;
  modality: 'online' | 'presencial';
  description?: string;
}

export interface ServicePackageItem {
  serviceId: string;
  quantity: number;
}

export interface ServicePackage {
  id: string;
  name: string;
  description?: string;
  items: ServicePackageItem[];
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  totalPrice: number;
}

export type ComandaStatus = 'aberta' | 'fechada';

export interface ComandaItem {
  id: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  description?: string;
}

export interface ComandaSession {
  id: string;
  number: number;
  date: string;
  status: 'pending' | 'completed';
}

export interface Comanda {
  id: string;
  patientId: string;
  patientName: string;
  status: ComandaStatus;
  description: string;
  items: ComandaItem[];
  sessions?: ComandaSession[];
  subtotal: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  totalValue: number;
  paidValue: number;
  startDate?: string;
  frequency?: 'unica' | 'semanal' | 'quinzenal' | 'mensal';
  createdAt: string;
}

export type ProductType = 'physical' | 'digital';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  brand: string;
  salesCount: number;
  type: ProductType;
  imageUrl?: string;
  expirationDate?: string;
  barcode?: string;
}

export type GoalStatus = 'acquisition' | 'maintenance' | 'generalization' | 'completed';

export interface ClinicalGoal {
  id: string;
  area: string;
  title: string;
  description: string;
  status: GoalStatus;
  currentValue: number;
  targetValue: number;
  startDate: string;
  history: { date: string, value: number }[];
}

export interface ABCRecord {
  id: string;
  date: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  intensity: 'low' | 'medium' | 'high';
  duration?: string;
}

export interface PEI {
  id: string;
  patientId: string;
  startDate: string;
  reviewDate: string;
  goals: ClinicalGoal[];
  abcRecords?: ABCRecord[];
  sensoryProfile?: {
    auditory: number;
    visual: number;
    tactile: number;
    vestibular: number;
    oral: number;
    social: number;
    proprioceptive: number;
    lastAssessmentDate: string;
  };
}

export interface Assessment {
  id: string;
  name: string;
  description: string;
  type: 'risk' | 'sum';
  cutoff?: number;
  questions: {
    id: string;
    text: string;
    riskAnswer?: string;
  }[];
  options?: {
    label: string;
    value: number;
  }[];
  color: string;
}

export interface RPDRecord {
  id: string;
  date: string;
  situation: string;
  thought: string;
  emotion: string;
  intensity: number;
  distortion?: string;
}

export interface SchemaItem {
  id: string;
  name: string;
  domain: string;
  active: boolean;
  intensity: number;
}

export interface DreamEntry {
  id: string;
  date: string;
  title: string;
  manifestContent: string;
  associations: string;
}
