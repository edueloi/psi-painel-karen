
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

export enum PaymentType {
  PRIVATE = 'Particular',
  INSURANCE = 'Convênio'
}

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  photoUrl?: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  maritalStatus?: MaritalStatus;
  education?: EducationLevel;
  profession?: string;
  hasChildren: boolean;
  numberOfChildren?: number;
  spouseName?: string;
  spouseContact?: string;
  fatherName?: string;
  motherName?: string;
  emergencyContact?: string;
  active: boolean;
  paymentType: PaymentType;
  insuranceProvider?: string;
  insuranceNumber?: string;
  needsReimbursement?: boolean;
  psychologistId: string;
}

export type AppointmentType = 'consulta' | 'bloqueio' | 'pessoal';
export type AppointmentModality = 'online' | 'presencial';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'confirmed';

export interface Appointment {
  id: string;
  patientId?: string;
  patientName?: string;
  psychologistId: string;
  psychologistName: string;
  title: string;
  start: Date;
  end: Date;
  status: AppointmentStatus;
  type: AppointmentType;
  modality: AppointmentModality;
  meetingUrl?: string;
  notes?: string;
  color?: string;
  duration_minutes?: number;
}

export interface ClinicalRecord {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  type: 'Evolução' | 'Anamnese' | 'Avaliação' | 'Encaminhamento';
  title: string;
  preview: string;
  status: 'Rascunho' | 'Finalizado';
  tags: string[];
}

export type QuestionType = 'text' | 'textarea' | 'number' | 'radio' | 'checkbox' | 'select';

export interface FormOption {
  label: string;
  value?: number;
}

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
  description: string;
  createdAt: string;
  questions: FormQuestion[];
  isGlobal?: boolean;
  responseCount: number;
  hash: string;
  interpretations?: InterpretationRule[];
}

export interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  cost: number;
  color: string;
  modality: AppointmentModality;
  description?: string;
}

export interface ComandaItem {
  id: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type ComandaStatus = 'aberta' | 'fechada';

export interface ComandaSession {
  id: string;
  number: number;
  date: string;
  status: 'pending' | 'completed';
}

export interface Comanda {
  id: string;
  description: string;
  patientId: string;
  patientName: string;
  status: ComandaStatus;
  totalValue: number;
  paidValue: number;
  items: ComandaItem[];
  sessions: ComandaSession[];
  createdAt: string;
  type?: 'servico' | 'pacote';
  subtotal?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  startDate?: string;
  frequency?: 'unica' | 'semanal' | 'quinzenal' | 'mensal';
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
  goals: ClinicalGoal[];
  startDate: string;
  reviewDate: string;
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
  questions: any[];
  options?: any[];
  color?: string;
}

export interface Document {
  id: string;
  title: string;
  category: string;
  type: string;
  size: string;
  date: string;
  url?: string;
}

export interface FormStats {
  totalForms: number;
  totalResponses: number;
  mostUsed: string | null;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: 'Lembrete' | 'Financeiro' | 'Aniversário' | 'Outros';
  lastUsed?: string;
}

export interface ServicePackageItem {
  serviceId: string;
  quantity: number;
}

export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  items: ServicePackageItem[];
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  totalPrice: number;
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
