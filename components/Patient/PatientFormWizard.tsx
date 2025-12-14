import React, { useState } from 'react';
import { Patient, MaritalStatus, EducationLevel, PaymentType } from '../../types';
import { INSURANCE_PROVIDERS } from '../../constants';
import { Button } from '../UI/Button';
import { ChevronRight, ChevronLeft, Save, User, MapPin, Heart, Users, CreditCard, FileText } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface PatientFormWizardProps {
  initialData?: Partial<Patient>;
  onSave: (data: Partial<Patient>) => void;
  onCancel: () => void;
}

export const PatientFormWizard: React.FC<PatientFormWizardProps> = ({ initialData = {}, onSave, onCancel }) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<Patient>>({
    active: true,
    paymentType: PaymentType.PRIVATE,
    address: { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
    hasChildren: false,
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

  const updateAddress = (field: keyof Patient['address'], value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address!, [field]: value }
    }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div className="col-span-1 md:col-span-2 flex justify-center mb-4">
              <div className="relative group cursor-pointer">
                <div className="h-24 w-24 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-2 border-slate-300">
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt="Foto" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-slate-400" />
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  {t('wizard.photo')}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('wizard.name')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={formData.name || ''} 
                onChange={e => updateField('name', e.target.value)}
                placeholder="Ex: João da Silva"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('wizard.email')}</label>
              <input 
                type="email" 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={formData.email || ''} 
                onChange={e => updateField('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('wizard.phone')}</label>
              <input 
                type="tel" 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={formData.whatsapp || ''} 
                onChange={e => updateField('whatsapp', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('wizard.cpf')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={formData.cpf || ''} 
                onChange={e => updateField('cpf', e.target.value)}
              />
            </div>
          </div>
        );
      
      case 1: // Address
        return (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 animate-fadeIn">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('wizard.zip')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={formData.address?.zipCode || ''} 
                onChange={e => updateAddress('zipCode', e.target.value)}
              />
            </div>
            <div className="md:col-span-4 space-y-2">
               <label className="text-sm font-medium text-slate-700">{t('wizard.street')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={formData.address?.street || ''} 
                onChange={e => updateAddress('street', e.target.value)}
              />
            </div>
            <div className="md:col-span-1 space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('wizard.number')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={formData.address?.number || ''} 
                onChange={e => updateAddress('number', e.target.value)}
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('wizard.neighborhood')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={formData.address?.neighborhood || ''} 
                onChange={e => updateAddress('neighborhood', e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('wizard.city')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={formData.address?.city || ''} 
                onChange={e => updateAddress('city', e.target.value)}
              />
            </div>
          </div>
        );

      case 2: // Social
        return (
          <div className="grid grid-cols-1 gap-6 animate-fadeIn">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('wizard.marital')}</label>
              <select 
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                value={formData.maritalStatus || ''}
                onChange={e => updateField('maritalStatus', e.target.value)}
              >
                <option value="">Selecione...</option>
                {Object.values(MaritalStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('wizard.education')}</label>
              <select 
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                value={formData.education || ''}
                onChange={e => updateField('education', e.target.value)}
              >
                <option value="">Selecione...</option>
                {Object.values(EducationLevel).map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('wizard.profession')}</label>
              <input 
                type="text" 
                className="w-full p-2.5 border border-slate-300 rounded-lg"
                value={formData.profession || ''} 
                onChange={e => updateField('profession', e.target.value)}
              />
            </div>
          </div>
        );

      case 3: // Family
        return (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="hasChildren"
                className="h-5 w-5 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                checked={formData.hasChildren || false}
                onChange={e => updateField('hasChildren', e.target.checked)}
              />
              <label htmlFor="hasChildren" className="text-sm font-medium text-slate-700">{t('wizard.hasChildren')}</label>
            </div>
            
            {formData.hasChildren && (
              <div className="pl-8 space-y-2">
                <label className="text-sm font-medium text-slate-700">{t('wizard.howMany')}</label>
                <input 
                  type="number" 
                  className="w-32 p-2 border border-slate-300 rounded-lg"
                  value={formData.numberOfChildren || 0}
                  onChange={e => updateField('numberOfChildren', parseInt(e.target.value))}
                />
              </div>
            )}
            
            <div className="border-t border-slate-200 my-4 pt-4">
              <h4 className="text-sm font-bold text-slate-800 mb-3">{t('wizard.spouse')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" placeholder={t('wizard.spouseName')}
                  className="p-2.5 border border-slate-300 rounded-lg"
                  value={formData.spouseName || ''}
                  onChange={e => updateField('spouseName', e.target.value)}
                />
                <input 
                  type="tel" placeholder={t('wizard.spouseContact')}
                  className="p-2.5 border border-slate-300 rounded-lg"
                  value={formData.spouseContact || ''}
                  onChange={e => updateField('spouseContact', e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 4: // Financial
        return (
          <div className="space-y-6 animate-fadeIn">
             <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('wizard.paymentType')}</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg flex-1 hover:bg-slate-50 transition-colors">
                  <input 
                    type="radio" 
                    name="paymentType" 
                    value={PaymentType.PRIVATE}
                    checked={formData.paymentType === PaymentType.PRIVATE}
                    onChange={() => updateField('paymentType', PaymentType.PRIVATE)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span>{t('wizard.private')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg flex-1 hover:bg-slate-50 transition-colors">
                  <input 
                    type="radio" 
                    name="paymentType" 
                    value={PaymentType.INSURANCE}
                    checked={formData.paymentType === PaymentType.INSURANCE}
                    onChange={() => updateField('paymentType', PaymentType.INSURANCE)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span>{t('wizard.insurance')}</span>
                </label>
              </div>
            </div>

            {formData.paymentType === PaymentType.INSURANCE && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{t('wizard.provider')}</label>
                  <select 
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                    value={formData.insuranceProvider || ''}
                    onChange={e => updateField('insuranceProvider', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {INSURANCE_PROVIDERS.map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{t('wizard.card')}</label>
                  <input 
                    type="text" 
                    className="w-full p-2.5 border border-slate-300 rounded-lg"
                    value={formData.insuranceNumber || ''}
                    onChange={e => updateField('insuranceNumber', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('wizard.status')}</label>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${formData.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {formData.active ? t('common.active') : t('common.inactive')}
                </span>
                <button 
                  onClick={() => updateField('active', !formData.active)}
                  className="text-sm text-primary-600 underline hover:text-primary-700"
                >
                  Alterar Status
                </button>
              </div>
            </div>
          </div>
        );

      case 5: // Docs
        return (
          <div className="space-y-4 animate-fadeIn">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
              <FileText className="h-10 w-10 mb-2 text-slate-400" />
              <p className="font-medium">{t('wizard.upload')}</p>
              <p className="text-xs mt-1">{t('wizard.uploadDesc')}</p>
            </div>
            <div className="text-xs text-slate-500 italic">
              * Nesta demonstração, o upload é apenas visual.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Wizard Header */}
      <div className="bg-slate-50 border-b border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">
            {initialData.id ? t('wizard.edit') : t('wizard.new')}
          </h2>
          <span className="text-xs font-medium bg-primary-100 text-primary-700 px-2 py-1 rounded">
             {t('wizard.step')} {currentStep + 1} {t('wizard.of')} {STEPS.length}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="relative h-1 w-full bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        
        {/* Step Icons */}
        <div className="hidden md:flex justify-between mt-4">
          {STEPS.map((step, idx) => (
            <div 
              key={step.id} 
              className={`flex flex-col items-center cursor-pointer ${idx === currentStep ? 'text-primary-600' : 'text-slate-400'}`}
              onClick={() => setCurrentStep(idx)}
            >
              <div className={`p-2 rounded-full mb-1 ${idx === currentStep ? 'bg-primary-100' : 'bg-transparent'}`}>
                {step.icon}
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-y-auto min-h-[400px]">
        {renderStepContent()}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
        <Button variant="ghost" onClick={currentStep === 0 ? onCancel : handlePrev}>
          {currentStep === 0 ? t('wizard.cancel') : <><ChevronLeft className="mr-1 h-4 w-4" /> {t('wizard.prev')}</>}
        </Button>
        
        {currentStep === STEPS.length - 1 ? (
          <Button variant="primary" onClick={() => onSave(formData)}>
            <Save className="mr-2 h-4 w-4" /> {t('wizard.save')}
          </Button>
        ) : (
          <Button variant="primary" onClick={handleNext}>
            {t('wizard.next')} <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
