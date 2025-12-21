import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Patient } from '../types';
import { ArrowLeft, FileText, Clock, User } from 'lucide-react';

type FormResponse = {
  id: string;
  patient_id?: string | null;
  respondent_name?: string | null;
  respondent_email?: string | null;
  respondent_phone?: string | null;
  score?: number | null;
  answers_json?: any;
  created_at?: string;
};

export const FormResponses: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formTitle, setFormTitle] = useState('Formulario');
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const [formData, responsesData, patientsData] = await Promise.all([
          api.get<any>(`/forms/${id}`),
          api.get<any[]>(`/forms/${id}/responses`),
          api.get<Patient[]>('/patients')
        ]);
        setFormTitle(formData.title || 'Formulario');
        setResponses(
          (responsesData || []).map((r: any) => ({
            id: String(r.id),
            patient_id: r.patient_id ? String(r.patient_id) : null,
            respondent_name: r.respondent_name ?? null,
            respondent_email: r.respondent_email ?? null,
            respondent_phone: r.respondent_phone ?? null,
            score: r.score ?? null,
            answers_json: r.answers_json ?? r.answers,
            created_at: r.created_at
          }))
        );
        setPatients(patientsData || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const getPatientName = (patientId?: string | null) => {
    if (!patientId) return '';
    return patients.find((p) => String(p.id) === String(patientId))?.full_name || '';
  };

  const formatDate = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans pb-10">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/formularios/lista')}
          className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{formTitle}</h1>
          <p className="text-sm text-slate-500">Respostas recebidas</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-slate-500">Carregando respostas...</div>
      ) : responses.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
          Nenhuma resposta registrada ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {responses.map((res) => {
            const patientName = getPatientName(res.patient_id);
            const respondentLabel = patientName || res.respondent_name || 'Visitante';
            const answersText = res.answers_json
              ? JSON.stringify(res.answers_json, null, 2)
              : '';
            return (
              <div key={res.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <User size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">{respondentLabel}</p>
                      <p className="text-xs text-slate-400">{res.respondent_email || res.respondent_phone || 'Sem contato'}</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <Clock size={14} /> {formatDate(res.created_at)}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
                  {res.score !== null && res.score !== undefined ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                      Pontuacao: {res.score}
                    </span>
                  ) : null}
                  {patientName ? (
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-bold">
                      Paciente vinculado
                    </span>
                  ) : null}
                </div>

                {answersText ? (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs font-bold text-indigo-600 flex items-center gap-2">
                      <FileText size={14} /> Ver respostas
                    </summary>
                    <pre className="mt-3 p-4 bg-slate-50 rounded-xl text-xs text-slate-600 overflow-x-auto">
{answersText}
                    </pre>
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
