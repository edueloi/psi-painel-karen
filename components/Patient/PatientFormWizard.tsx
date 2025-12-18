import React, { useState } from 'react';
import { Patient, MaritalStatus, EducationLevel } from '../../types';
import { CheckCircle, ChevronRight, ChevronLeft, Save, User, MapPin, Heart, Users, CreditCard, FileText, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface PatientFormWizardProps {
  initialData?: Partial<Patient>;
  onSave: (data: Partial<Patient>) => void;
  onCancel: () => void;
}

export const PatientFormWizard: React.FC<PatientFormWizardProps> = ({ initialData = {} as Partial<Patient>, onSave, onCancel }) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<Patient>>({
    status: 'ativo',
    convenio: false,
    has_children: false,
    needs_reimbursement: false,
    ...initialData
  });

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-slate-700">{t('wizard.name')}</label>
              <input 
                type="text" 
                required
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.full_name || ''} 
                onChange={e => updateField('full_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t('wizard.email')}</label>
              <input 
                type="email" 
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.email || ''} 
                onChange={e => updateField('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t('wizard.phone')}</label>
              <input 
                type="tel" 
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.whatsapp || ''} 
                onChange={e => updateField('whatsapp', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t('wizard.taxId')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.cpf_cnpj || ''} 
                onChange={e => updateField('cpf_cnpj', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t('wizard.birthDate')}</label>
              <input 
                type="date" 
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.birth_date ? formData.birth_date.split('T')[0] : ''} 
                onChange={e => updateField('birth_date', e.target.value)}
              />
            </div>
          </div>
        );
      
      case 1: // Endereço
        return (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 animate-fadeIn">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-slate-700">{t('wizard.zip')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                value={formData.address_zip || ''} 
                onChange={e => updateField('address_zip', e.target.value)}
              />
            </div>
            <div className="md:col-span-4 space-y-2">
               <label className="text-sm font-bold text-slate-700">{t('wizard.street')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                value={formData.street || ''} 
                onChange={e => updateField('street', e.target.value)}
              />
            </div>
            <div className="md:col-span-1 space-y-2">
              <label className="text-sm font-bold text-slate-700">{t('wizard.number')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                value={formData.house_number || ''} 
                onChange={e => updateField('house_number', e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-slate-700">{t('wizard.neighborhood')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                value={formData.neighborhood || ''} 
                onChange={e => updateField('neighborhood', e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-slate-700">{t('wizard.city')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                value={formData.city || ''} 
                onChange={e => updateField('city', e.target.value)}
              />
            </div>
            <div className="md:col-span-1 space-y-2">
              <label className="text-sm font-bold text-slate-700">{t('wizard.state')}</label>
              <input 
                type="text" maxLength={2}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                value={formData.state || ''} 
                onChange={e => updateField('state', e.target.value.toUpperCase())}
              />
            </div>
          </div>
        );

      case 2: // Social
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t('wizard.civilStatus')}</label>
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
              <label className="text-sm font-bold text-slate-700">{t('wizard.education')}</label>
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
              <label className="text-sm font-bold text-slate-700">{t('wizard.profession')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                value={formData.profession || ''} 
                onChange={e => updateField('profession', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t('wizard.nationality')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
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
              <label htmlFor="has_children" className="text-sm font-bold text-slate-700">{t('wizard.hasChildren')}</label>
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
              <label className="text-sm font-bold text-slate-700">{t('wizard.paymentType')}</label>
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
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white outline-none"
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
              <label className="text-sm font-bold text-slate-700">{t('wizard.status')}</label>
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                <button 
                  onClick={() => updateField('status', 'ativo')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.status === 'ativo' ? 'bg-emerald-50 text-white shadow-md' : 'text-slate-500'}`}
                >
                  {t('common.all').toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        );

      case 5: // Docs
        return (
          <div className="space-y-4 animate-fadeIn">
            <div className="border-2 border-dashed border-slate-300 rounded-[2rem] p-12 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-indigo-50/30 hover:border-indigo-300 transition-all cursor-pointer group">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <FileText className="h-8 w-8 text-indigo-400" />
              </div>
              <p className="font-bold text-slate-700">{t('wizard.attachDocs')}</p>
              <p className="text-xs mt-1">{t('wizard.docsHint')}</p>
            </div>
            <div className="text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">{t('wizard.lgpd')}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-display font-bold text-slate-800">
                {formData.id ? t('wizard.editTitle') : t('wizard.newTitle')}
            </h2>
            <p className="text-xs text-slate-500">{t('wizard.stepInfo')?.replace('{current}', (currentStep + 1).toString()).replace('{total}', STEPS.length.toString()).replace('{title}', STEPS[currentStep].title)}</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20}/></button>
        </div>
        
        {/* Step Icons */}
        <div className="flex justify-between items-center px-4 md:px-10">
          {STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div 
                className={`flex flex-col items-center transition-all ${idx <= currentStep ? 'text-indigo-600' : 'text-slate-300'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${idx === currentStep ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : idx < currentStep ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                  {idx < currentStep ? <CheckCircle size={20} /> : step.icon}
                </div>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 md:mx-4 transition-colors ${idx < currentStep ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto min-h-[400px]">
        {renderStepContent()}
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
        <button 
            onClick={currentStep === 0 ? onCancel : handlePrev}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors flex items-center gap-2"
        >
            <ChevronLeft size={20} /> {currentStep === 0 ? t('common.cancel') : t('wizard.back')}
        </button>
        
        {currentStep === STEPS.length - 1 ? (
          <button 
            onClick={() => onSave(formData)}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
          >
            <Save size={20} /> {t('wizard.finish')}
          </button>
        ) : (
          <button 
            onClick={handleNext}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
          >
            {t('wizard.next')} <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
};