
export enum UserRole {
  ADMIN = 'ADMIN',
  PSYCHOLOGIST = 'PSYCHOLOGIST',
  SECRETARY = 'SECRETARY'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Professional {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpfCnpj?: string;
  profession: string; // e.g. Psicólogo, Nutricionista
  registrationNumber?: string; // CRP/CRM
  color: string;
  role: UserRole;
  commissionRate: number; // Percentage 0-100
  hasAgenda: boolean;
  isThirdParty: boolean; // Prestador terceiro
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
  
  // Address
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };

  // Social
  maritalStatus?: MaritalStatus;
  education?: EducationLevel;
  profession?: string;

  // Family
  hasChildren: boolean;
  numberOfChildren?: number;
  spouseName?: string;
  spouseContact?: string;
  fatherName?: string;
  motherName?: string;
  emergencyContact?: string;

  // Medical/Financial
  active: boolean;
  paymentType: PaymentType;
  insuranceProvider?: string;
  insuranceNumber?: string;

  psychologistId: string; // To link to specific doctor
}

export type AppointmentType = 'consulta' | 'bloqueio' | 'pessoal';
export type AppointmentModality = 'online' | 'presencial';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'confirmed';

export interface Appointment {
  id: string;
  patientId?: string; // Optional if it's a block
  patientName?: string; // Denormalized for display
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
  
  // Recurrence Logic
  recurrence?: 'none' | 'weekly' | 'biweekly' | 'monthly';
  recurrenceEndType?: 'count' | 'date'; // 'count' = X times, 'date' = until Y date
  recurrenceEndValue?: string | number; // Holds the count (e.g., 10) or date string
  recurrenceGroupId?: string; // To link series together
}

export interface Document {
  id: string;
  title: string;
  category: string;
  type: 'pdf' | 'doc' | 'image' | 'sheet' | 'other';
  date: string;
  size: string;
  url: string;
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

export interface FormStats {
  totalForms: number;
  totalResponses: number;
  mostUsed: {
    title: string;
    responseCount: number;
  } | null;
}

export type QuestionType = 'text' | 'textarea' | 'number' | 'radio' | 'checkbox' | 'select';

export interface FormQuestion {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options?: string[];
}

export interface ClinicalForm {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  questions: FormQuestion[];
  responseCount: number;
  hash: string;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: 'Lembrete' | 'Financeiro' | 'Aniversário' | 'Outros';
  lastUsed?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  duration: number; // in minutes
  price: number;
  cost: number;
  color: string;
  modality: AppointmentModality;
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
  totalPrice: number; // Calculated after discount
}

export type ComandaStatus = 'aberta' | 'fechada';
export type ComandaType = 'servico' | 'pacote';
export type Frequency = 'unica' | 'semanal' | 'quinzenal' | 'mensal';

export interface ComandaItem {
  id: string;
  serviceId: string;
  serviceName: string; // Denormalized
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Comanda {
  id: string;
  description: string;
  patientId: string;
  patientName: string;
  startDate: string;
  endDate?: string; // For filtering
  status: ComandaStatus;
  type: ComandaType;
  
  // Service Specifics
  frequency?: Frequency;
  recurrenceDay?: string; // e.g. "Segunda-feira"
  
  items: ComandaItem[];
  
  // Financials
  subtotal: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  totalValue: number;
  paidValue: number;
  
  createdAt: string;
}

export type ProductType = 'physical' | 'digital';

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  imageUrl?: string;
  brand: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  expirationDate?: string;
  barcode?: string;
  salesCount: number; // For "top sellers" analytics
}
