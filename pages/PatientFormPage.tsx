import React, { useEffect, useState } from 'react';
import { ArrowLeft, UserPlus, Edit2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Patient } from '../types';
import { PatientFormWizard } from '../components/Patient/PatientFormWizard';
import { Button, ContentCard, EmptyState, PageWrapper, SectionTitle } from '../components/UI';
import { useToast } from '../contexts/ToastContext';

const COUNTRY_DDI: Record<string, string> = {
  BR: '55', PT: '351', US: '1', CA: '1', AR: '54', CL: '56', CO: '57', MX: '52',
  UY: '598', PY: '595', PE: '51', BO: '591', GB: '44', DE: '49', ES: '34', FR: '33',
  IT: '39', CH: '41', NL: '31', BE: '32', IE: '353', IL: '972', AE: '971', AU: '61',
  JP: '81', CN: '86',
};

const prefixPhone = (raw: string | null | undefined, country: string | undefined) => {
  if (!raw) return null;
  const code = country || 'BR';
  if (code === 'BR' || code === 'OTHER' || !COUNTRY_DDI[code]) return raw;
  const digits = raw.replace(/\D/g, '');
  return digits ? `+${COUNTRY_DDI[code]}${digits}` : null;
};

export const PatientFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const editing = Boolean(id);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<Patient>(`/patients/${id}`)
      .then(setPatient)
      .catch(() => setPatient(null))
      .finally(() => setLoading(false));
  }, [id]);

  const returnToPatient = () => navigate(editing ? `/pacientes/${id}` : '/pacientes');

  const handleSave = async (
    data: Partial<Patient>,
    files: { file: File; label: string }[],
    photoFile?: File | null,
  ) => {
    if (saving) return;
    setSaving(true);
    try {
      const phoneCountry = data.phone_country || 'BR';
      const phone2Country = data.phone2_country || 'BR';
      const payload = {
        name: data.full_name,
        email: data.email || null,
        phone: prefixPhone(data.whatsapp || data.phone || null, phoneCountry),
        whatsapp: prefixPhone(data.whatsapp || data.phone || null, phoneCountry),
        phone2: prefixPhone(data.phone2 || null, phone2Country),
        phone_country: phoneCountry,
        phone2_country: phone2Country,
        country: (data as any).country || 'BR',
        birth_date: data.birth_date || null,
        cpf: data.cpf_cnpj || data.cpf || null,
        rg: data.rg || null,
        gender: data.gender || null,
        marital_status: data.marital_status || null,
        education: data.education || null,
        profession: data.profession || null,
        nationality: data.nationality || null,
        naturality: (data as any).naturality || null,
        has_children: data.has_children ? 1 : 0,
        children_count: data.children_count || 0,
        minor_children_count: data.minor_children_count || 0,
        spouse_name: data.spouse_name || null,
        spouse_phone: data.spouse_phone || null,
        family_contact: data.family_contact || null,
        emergency_contact: data.emergency_contact || null,
        emergency_contacts: data.emergency_contacts ? JSON.stringify(data.emergency_contacts) : null,
        address: data.street ? `${data.street}${data.house_number ? `, ${data.house_number}` : ''}${data.neighborhood ? ` - ${data.neighborhood}` : ''}` : null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.address_zip || null,
        address_cep: data.address_zip || null,
        address_logradouro: data.street || null,
        address_numero: data.house_number || null,
        address_bairro: data.neighborhood || null,
        address_uf: data.state || null,
        address_municipio_ibge: data.municipio_ibge || null,
        notes: data.notes || null,
        status: data.status || 'ativo',
        health_plan: data.convenio ? data.convenio_name || 'Sim' : null,
        responsible_professional_id: data.psychologist_id || null,
        diagnosis: (data as any).diagnosis || null,
        is_payer: data.is_payer !== undefined ? data.is_payer : true,
        payer_name: data.payer_name || null,
        payer_cpf: data.payer_cpf || null,
        payer_phone: data.payer_phone || null,
      };
      const saved = editing
        ? await api.put<any>(`/patients/${id}`, payload)
        : await api.post<any>('/patients', payload);
      const patientId = saved?.id || id;

      for (const document of files) {
        const body = new FormData();
        body.append('file', document.file);
        body.append('title', document.label.trim() || document.file.name);
        body.append('category', 'Paciente');
        body.append('patient_id', String(patientId));
        await api.request('/uploads', { method: 'POST', body });
      }
      if (photoFile && patientId) {
        const body = new FormData();
        body.append('photo', photoFile);
        await api.request(`/patients/${patientId}/photo`, { method: 'POST', body });
      }

      pushToast('success', editing ? 'Paciente atualizado com sucesso!' : 'Paciente criado com sucesso!');
      navigate(`/pacientes/${patientId}`);
    } catch (error: any) {
      const message = error?.message || 'Erro ao salvar paciente. Verifique os dados e tente novamente.';
      pushToast(message.startsWith('CPF já cadastrado') ? 'warning' : 'error', message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageWrapper><div role="status" className="py-12 text-center text-sm text-slate-500">Carregando cadastro…</div></PageWrapper>;
  }

  if (editing && !patient) {
    return (
      <PageWrapper>
        <ContentCard><EmptyState icon={Edit2} title="Paciente não encontrado" action={<Button variant="outline" size="sm" onClick={() => navigate('/pacientes')}>Voltar à lista</Button>} /></ContentCard>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={returnToPatient} iconLeft={<ArrowLeft size={14} />}>Voltar</Button>
          {saving && <span className="text-xs text-slate-500">Salvando cadastro…</span>}
        </div>
        <SectionTitle
          icon={editing ? Edit2 : UserPlus}
          title={editing ? 'Editar paciente' : 'Novo paciente'}
          description={editing ? 'Atualize os dados cadastrais, documentos e informações financeiras.' : 'Preencha o cadastro do paciente por etapas.'}
        />
        <ContentCard padding="none" className="overflow-visible">
          <PatientFormWizard pageScroll initialData={patient || {}} onCancel={returnToPatient} onSave={handleSave} />
        </ContentCard>
      </div>
    </PageWrapper>
  );
};
