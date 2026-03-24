import React, { useState, useRef } from 'react';
import { Patient, MaritalStatus, EducationLevel } from '../../types';
import { CheckCircle, ChevronRight, ChevronLeft, Save, User, MapPin, Heart, Users, CreditCard, FileText, X, Loader2, Camera } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { API_BASE_URL } from '../../services/api';
import { DatePicker } from '../UI/DatePicker';

/* ─── Países e DDI ────────────────────────────────────── */
const COUNTRIES = [
  { code: 'BR', ddi: '55', name: 'Brasil', flag: '🇧🇷', mask: '(00) 00000-0000' },
  { code: 'PT', ddi: '351', name: 'Portugal', flag: '🇵🇹', mask: '000 000 000' },
  { code: 'US', ddi: '1', name: 'EUA', flag: '🇺🇸', mask: '(000) 000-0000' },
  { code: 'CA', ddi: '1', name: 'Canadá', flag: '🇨🇦', mask: '(000) 000-0000' },
  { code: 'AR', ddi: '54', name: 'Argentina', flag: '🇦🇷', mask: '00 0000-0000' },
  { code: 'CL', ddi: '56', name: 'Chile', flag: '🇨🇱', mask: '0 0000 0000' },
  { code: 'CO', ddi: '57', name: 'Colômbia', flag: '🇨🇴', mask: '000 000 0000' },
  { code: 'MX', ddi: '52', name: 'México', flag: '🇲🇽', mask: '00 0000 0000' },
  { code: 'UY', ddi: '598', name: 'Uruguai', flag: '🇺🇾', mask: '0 000 0000' },
  { code: 'PY', ddi: '595', name: 'Paraguai', flag: '🇵🇾', mask: '000 000 000' },
  { code: 'PE', ddi: '51', name: 'Peru', flag: '🇵🇪', mask: '000 000 000' },
  { code: 'BO', ddi: '591', name: 'Bolívia', flag: '🇧🇴', mask: '0 000 0000' },
  { code: 'GB', ddi: '44', name: 'Reino Unido', flag: '🇬🇧', mask: '0000 000000' },
  { code: 'DE', ddi: '49', name: 'Alemanha', flag: '🇩🇪', mask: '000 00000000' },
  { code: 'ES', ddi: '34', name: 'Espanha', flag: '🇪🇸', mask: '000 000 000' },
  { code: 'FR', ddi: '33', name: 'França', flag: '🇫🇷', mask: '0 00 00 00 00' },
  { code: 'IT', ddi: '39', name: 'Itália', flag: '🇮🇹', mask: '000 000 0000' },
  { code: 'CH', ddi: '41', name: 'Suíça', flag: '🇨🇭', mask: '00 000 00 00' },
  { code: 'NL', ddi: '31', name: 'Países Baixos', flag: '🇳🇱', mask: '0 00 000000' },
  { code: 'BE', ddi: '32', name: 'Bélgica', flag: '🇧🇪', mask: '000 00 00 00' },
  { code: 'IE', ddi: '353', name: 'Irlanda', flag: '🇮🇪', mask: '00 000 0000' },
  { code: 'IL', ddi: '972', name: 'Israel', flag: '🇮🇱', mask: '00-000-0000' },
  { code: 'AE', ddi: '971', name: 'Emirados Árabes', flag: '🇦🇪', mask: '00 000 0000' },
  { code: 'AU', ddi: '61', name: 'Austrália', flag: '🇦🇺', mask: '0 0000 0000' },
  { code: 'JP', ddi: '81', name: 'Japão', flag: '🇯🇵', mask: '00 0000 0000' },
  { code: 'CN', ddi: '86', name: 'China', flag: '🇨🇳', mask: '000 0000 0000' },
  { code: 'OTHER', ddi: '', name: 'Outro', flag: '🌐', mask: '' },
];

/* ─── Máscaras ─────────────────────────────────────────── */
/* ─── Máscaras ─────────────────────────────────────────── */
const applyMask = (value: string, pattern: string) => {
  if (!pattern) return value;
  let result = '';
  let vIdx = 0;
  for (let i = 0; i < pattern.length && vIdx < value.length; i++) {
    if (pattern[i] === '0') {
      result += value[vIdx++];
    } else {
      result += pattern[i];
    }
  }
  return result;
};

const maskPhone = (v: string, countryCode: string = 'BR') => {
  const d = v.replace(/\D/g, '');
  const country = COUNTRIES.find(c => c.code === countryCode);
  
  if (!country || !country.mask) return d.slice(0, 15);

  // Caso especial Brasil (9 dígitos vs 8 dígitos)
  if (countryCode === 'BR') {
    const digits = d.slice(0, 11);
    if (digits.length <= 10) return applyMask(digits, '(00) 0000-0000');
    return applyMask(digits, '(00) 00000-0000');
  }

  return applyMask(d, country.mask);
};

const maskCpfCnpj = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/[.-]$/, '').replace(/\.$/, '');
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').replace(/[-/.]$/, '');
};

const maskCep = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.replace(/(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '');
};

interface DocFile { file: File; label: string; }

interface PatientFormWizardProps {
  initialData?: Partial<Patient>;
  onSave: (data: Partial<Patient>, files: DocFile[], photoFile?: File | null) => void;
  onCancel: () => void;
}

export const PatientFormWizard: React.FC<PatientFormWizardProps> = ({ initialData = {} as Partial<Patient>, onSave, onCancel }) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [cepLoading, setCepLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<DocFile[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(initialData.photo_url || (initialData as any).photoUrl || '');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<Patient>>({
    status: 'ativo',
    convenio: false,
    has_children: false,
    needs_reimbursement: false,
    is_payer: true,
    phone_country: 'BR',
    phone2_country: 'BR',
    ...initialData
  });

  const fetchCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch { /* silencia erro de rede */ } finally {
      setCepLoading(false);
    }
  };

  const STEPS = [
    { id: 'basic', title: t('wizard.step1'), icon: <User size={18} /> },
    { id: 'address', title: t('wizard.step2'), icon: <MapPin size={18} /> },
    { id: 'social', title: t('wizard.step3'), icon: <Heart size={18} /> },
    { id: 'family', title: t('wizard.step4'), icon: <Users size={18} /> },
    { id: 'financial', title: t('wizard.step5'), icon: <CreditCard size={18} /> },
    { id: 'docs', title: t('wizard.step6'), icon: <FileText size={18} /> },
  ];

  const updateField = (field: keyof Patient, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const maritalOptions = [
      { value: MaritalStatus.SINGLE, label: t('marital.single') },
      { value: MaritalStatus.MARRIED, label: t('marital.married') },
      { value: MaritalStatus.DIVORCED, label: t('marital.divorced') },
      { value: MaritalStatus.WIDOWED, label: t('marital.widowed') },
      { value: MaritalStatus.COHABITING, label: t('marital.cohabiting') },
      { value: MaritalStatus.SEPARATED, label: t('marital.separated') },
  ];

  const educationOptions = [
      { value: EducationLevel.PRIMARY_INC, label: t('education.primaryInc') },
      { value: EducationLevel.PRIMARY_COM, label: t('education.primaryCom') },
      { value: EducationLevel.SECONDARY_INC, label: t('education.secondaryInc') },
      { value: EducationLevel.SECONDARY_COM, label: t('education.secondaryCom') },
      { value: EducationLevel.HIGHER_INC, label: t('education.higherInc') },
      { value: EducationLevel.HIGHER_COM, label: t('education.higherCom') },
      { value: EducationLevel.POST_GRAD, label: t('education.postGrad') },
      { value: EducationLevel.MASTER, label: t('education.master') },
      { value: EducationLevel.DOCTORATE, label: t('education.doctorate') },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Básico
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
            {/* Photo upload */}
            <div className="md:col-span-2 flex justify-center mb-2">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setPhotoFile(file);
                  const reader = new FileReader();
                  reader.onload = ev => setPhotoPreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="relative group w-20 h-20 rounded-full border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-colors overflow-hidden bg-slate-50"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-1 text-slate-400">
                    <User size={24} />
                    <span className="text-[9px] font-bold uppercase tracking-wide">Foto</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={18} className="text-white" />
                </div>
              </button>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.name')}</label>
              <input 
                type="text" 
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                value={formData.full_name || ''} 
                onChange={e => updateField('full_name', e.target.value)}
              />
            </div>
            
            {/* Email - ocupando espaço total como solicitado */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.email')}</label>
              <input 
                type="email" 
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                value={formData.email || ''} 
                onChange={e => updateField('email', e.target.value)}
              />
            </div>

            {/* Telefones - País/DDI e Número */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">
                {t('wizard.phone')}
                {formData.phone_country && formData.phone_country !== 'OTHER' && (
                  <span className="ml-1 text-[10px] text-indigo-500 font-bold">
                    (+{COUNTRIES.find(c => c.code === formData.phone_country)?.ddi})
                  </span>
                )}
              </label>
              <div className="flex gap-1.5">
                <select 
                  className="w-[85px] p-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                  value={formData.phone_country || 'BR'}
                  onChange={e => updateField('phone_country', e.target.value)}
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder={COUNTRIES.find(c => c.code === formData.phone_country)?.mask || 'Telefone'}
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none shadow-sm"
                  value={formData.whatsapp || ''}
                  onChange={e => updateField('whatsapp', maskPhone(e.target.value, formData.phone_country))}
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">
                Telefone 2
                {formData.phone2_country && formData.phone2_country !== 'OTHER' && (
                   <span className="ml-1 text-[10px] text-indigo-500 font-bold">
                    (+{COUNTRIES.find(c => c.code === formData.phone2_country)?.ddi})
                  </span>
                )}
              </label>
              <div className="flex gap-1.5">
                <select 
                  className="w-[85px] p-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                  value={formData.phone2_country || 'BR'}
                  onChange={e => updateField('phone2_country', e.target.value)}
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder={COUNTRIES.find(c => c.code === formData.phone2_country)?.mask || 'Telefone'}
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none shadow-sm"
                  value={formData.phone2 || ''}
                  onChange={e => updateField('phone2', maskPhone(e.target.value, formData.phone2_country))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.taxId')}</label>
              <input
                type="text"
                placeholder="000.000.000-00"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                value={formData.cpf_cnpj || ''}
                onChange={e => updateField('cpf_cnpj', maskCpfCnpj(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.birthDate')}</label>
              <DatePicker
                value={formData.birth_date ? formData.birth_date.split('T')[0] : ''}
                onChange={val => updateField('birth_date', val)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-slate-600">Observações / Referência</label>
              <textarea 
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none resize-none"
                value={formData.notes || ''} 
                onChange={e => updateField('notes', e.target.value)}
              />
            </div>
          </div>
        );
      
      case 1: // Endereço
        return (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 animate-fadeIn">
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.zip')}</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="00000-000"
                  maxLength={9}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 pr-8"
                  value={formData.address_zip || ''}
                  onChange={e => {
                    const masked = maskCep(e.target.value);
                    updateField('address_zip', masked);
                    fetchCep(masked);
                  }}
                />
                {cepLoading && <Loader2 size={14} className="animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400" />}
              </div>
            </div>
            <div className="md:col-span-4 space-y-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.street')}</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                value={formData.street || ''}
                onChange={e => updateField('street', e.target.value)}
              />
            </div>
            <div className="md:col-span-1 space-y-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.number')}</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                value={formData.house_number || ''} 
                onChange={e => updateField('house_number', e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.neighborhood')}</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                value={formData.neighborhood || ''} 
                onChange={e => updateField('neighborhood', e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.city')}</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                value={formData.city || ''} 
                onChange={e => updateField('city', e.target.value)}
              />
            </div>
            <div className="md:col-span-1 space-y-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.state')}</label>
              <input 
                type="text" maxLength={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                value={formData.state || ''} 
                onChange={e => updateField('state', e.target.value.toUpperCase())}
              />
            </div>
          </div>
        );

      case 2: // Social
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.civilStatus')}</label>
              <select 
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white outline-none"
                value={formData.marital_status || ''}
                onChange={e => updateField('marital_status', e.target.value)}
              >
                <option value="">{t('common.all')}...</option>
                {maritalOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.education')}</label>
              <select 
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white outline-none"
                value={formData.education || ''}
                onChange={e => updateField('education', e.target.value)}
              >
                <option value="">{t('common.all')}...</option>
                {educationOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.profession')}</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                value={formData.profession || ''} 
                onChange={e => updateField('profession', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.nationality')}</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                value={formData.nationality || ''} 
                onChange={e => updateField('nationality', e.target.value)}
              />
            </div>
          </div>
        );

      case 3: // Família
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <input 
                type="checkbox" 
                id="has_children"
                className="h-5 w-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                checked={formData.has_children || false}
                onChange={e => updateField('has_children', e.target.checked)}
              />
              <label htmlFor="has_children" className="text-xs font-semibold text-slate-600">{t('wizard.hasChildren')}</label>
            </div>
            
            {formData.has_children && (
              <div className="grid grid-cols-2 gap-4 pl-8">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t('wizard.childrenTotal')}</label>
                    <input 
                    type="number" 
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    value={formData.children_count || 0}
                    onChange={e => updateField('children_count', parseInt(e.target.value))}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t('wizard.childrenMinors')}</label>
                    <input 
                    type="number" 
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    value={formData.minor_children_count || 0}
                    onChange={e => updateField('minor_children_count', parseInt(e.target.value))}
                    />
                </div>
              </div>
            )}
            
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Heart size={16} className="text-rose-500"/> {t('wizard.spouseData')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" placeholder={t('wizard.spouseName')}
                  className="p-2.5 border border-slate-300 rounded-xl outline-none"
                  value={formData.spouse_name || ''}
                  onChange={e => updateField('spouse_name', e.target.value)}
                />
                <input 
                  type="text" placeholder={t('wizard.familyContact')}
                  className="p-2.5 border border-slate-300 rounded-xl outline-none"
                  value={formData.family_contact || ''}
                  onChange={e => updateField('family_contact', e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 4: // Financeiro
        return (
          <div className="space-y-6 animate-fadeIn">
             <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.paymentType')}</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer border p-4 rounded-xl flex-1 hover:bg-slate-50 transition-colors shadow-sm">
                  <input 
                    type="radio" 
                    name="convenio" 
                    checked={!formData.convenio}
                    onChange={() => updateField('convenio', false)}
                    className="text-indigo-600"
                  />
                  <span className="font-bold">{t('wizard.private')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer border p-4 rounded-xl flex-1 hover:bg-slate-50 transition-colors shadow-sm">
                  <input 
                    type="radio" 
                    name="convenio" 
                    checked={formData.convenio}
                    onChange={() => updateField('convenio', true)}
                    className="text-indigo-600"
                  />
                  <span className="font-bold">{t('wizard.insurance')}</span>
                </label>
              </div>
            </div>

            {formData.convenio && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('wizard.insuranceName')}</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    value={formData.convenio_name || ''}
                    onChange={e => updateField('convenio_name', e.target.value)}
                  />
                </div>
                
                <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 text-indigo-600" 
                        checked={formData.needs_reimbursement || false}
                        onChange={e => updateField('needs_reimbursement', e.target.checked)}
                    />
                    <span className="text-xs font-bold text-slate-700">{t('wizard.reimbursementReq')}</span>
                </label>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">{t('wizard.status')}</label>
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit gap-1">
                <button
                  type="button"
                  onClick={() => updateField('status', 'ativo')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.status === 'ativo' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Ativo
                </button>
                <button
                  type="button"
                  onClick={() => updateField('status', 'inativo')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.status === 'inativo' ? 'bg-slate-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Inativo
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-6 mt-6 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <User size={16} className="text-indigo-500" /> Responsável Financeiro
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium tracking-tight">O paciente é o próprio pagador?</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('is_payer', !formData.is_payer)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.is_payer ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.is_payer ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              {!formData.is_payer && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-fadeIn">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className={`text-xs font-bold uppercase tracking-wider ${!formData.payer_name ? 'text-rose-500' : 'text-slate-500'}`}>
                      Nome do Pagador *
                    </label>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all ${!formData.payer_name ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400'}`}
                      value={formData.payer_name || ''}
                      onChange={e => updateField('payer_name', e.target.value)}
                      placeholder="Nome completo do responsável"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold uppercase tracking-wider ${!formData.payer_cpf ? 'text-rose-500' : 'text-slate-500'}`}>
                      CPF do Pagador *
                    </label>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all ${!formData.payer_cpf ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400'}`}
                      value={formData.payer_cpf || ''}
                      onChange={e => updateField('payer_cpf', maskCpfCnpj(e.target.value))}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Telefone do Pagador
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                      value={formData.payer_phone || ''}
                      onChange={e => updateField('payer_phone', maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 5: // Docs
        return (
          <div className="space-y-4 animate-fadeIn">
            <input 
              type="file" 
              className="hidden" 
              id="patient-docs-upload" 
              multiple 
              onChange={async (e) => {
                const files: File[] = Array.from(e.target.files || []);
                if (!files.length) return;
                setSelectedFiles(prev => [
                  ...prev,
                  ...files.map(f => ({ file: f, label: f.name }))
                ]);
                e.target.value = '';
              }}
            />
            <label 
              htmlFor="patient-docs-upload"
              className="border-2 border-dashed border-slate-300 rounded-[2rem] p-12 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-indigo-50/30 hover:border-indigo-300 transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <FileText className="h-8 w-8 text-indigo-400" />
              </div>
              <p className="font-bold text-slate-700">{t('wizard.attachDocs')}</p>
              <p className="text-xs mt-1">{t('wizard.docsHint')}</p>
            </label>
            <div className="text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">{t('wizard.lgpd')}</span>
            </div>
            {selectedFiles.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-600">
                  {selectedFiles.length} arquivo(s) selecionado(s)
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedFiles.map((doc, idx) => (
                    <div key={`${doc.file.name}-${doc.file.size}-${idx}`} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={doc.label}
                          onChange={e => setSelectedFiles(prev => prev.map((d, i) => i === idx ? { ...d, label: e.target.value } : d))}
                          placeholder="Nome do documento (opcional)"
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 text-slate-700"
                        />
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate px-0.5">{doc.file.name}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {formData.id ? t('wizard.editTitle') : t('wizard.newTitle')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Passo {currentStep + 1} de {STEPS.length} — {STEPS[currentStep].title}
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400">
            <X size={16} />
          </button>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-1">
          {STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all text-xs cursor-pointer ${
                  idx === currentStep
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : idx < currentStep
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-500'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300'
                }`}
              >
                {idx < currentStep ? <CheckCircle size={14} /> : step.icon}
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-px transition-colors ${idx < currentStep ? 'bg-indigo-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 py-4 overflow-y-auto">
        {renderStepContent()}
      </div>

      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
        <button
          onClick={currentStep === 0 ? onCancel : handlePrev}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
        >
          <ChevronLeft size={16} /> {currentStep === 0 ? t('common.cancel') : t('wizard.back')}
        </button>

        {currentStep === STEPS.length - 1 ? (
          <button
            onClick={() => onSave(formData, selectedFiles, photoFile)}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            <Save size={15} /> {t('wizard.finish')}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {formData.id && (
              <button
                onClick={() => onSave(formData, selectedFiles, photoFile)}
                className="px-4 py-2 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5"
              >
                <Save size={15} /> {t('common.save')}
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              {t('wizard.next')} <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
