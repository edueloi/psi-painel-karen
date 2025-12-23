
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Patient } from '../types';
import { ArrowLeft, FileText, Clock, User, Filter, ChevronDown } from 'lucide-react';

type FormResponse = {
  id: string;
  form_id: string;
  form_title: string;
  patient_id?: string | null;
  respondent_name?: string | null;
  respondent_email?: string | null;
  respondent_phone?: string | null;
  score?: number | null;
  answers_json?: any;
  created_at?: string;
};

export const FormsResponsesAll: React.FC = () => {
  const navigate = useNavigate();
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [forms, setForms] = useState<{ id: string; title: string }[]>([]);
  const [questionsMap, setQuestionsMap] = useState<Record<string, Record<string, string>>>({});
  const [selectedFormId, setSelectedFormId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [formsData, patientsData] = await Promise.all([
          api.get<any[]>('/forms'),
          api.get<Patient[]>('/patients')
        ]);
        const mappedForms = formsData.map((f) => ({ id: String(f.id), title: f.title }));
        setForms(mappedForms);
        setPatients(patientsData || []);

        const responsesBuckets = await Promise.all(
          mappedForms.map((form) =>
            api.get<any[]>(`/forms/${form.id}/responses`).then((rows) =>
              rows.map((r) => ({ ...r, form_title: form.title, form_id: form.id }))
            )
          )
        );
        const allResponses = responsesBuckets.flat();
        const mapped = allResponses
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map((r) => ({
            id: String(r.id),
            form_id: String(r.form_id || r.formId || r.form_id),
            form_title: r.form_title,
            patient_id: r.patient_id ? String(r.patient_id) : null,
            respondent_name: r.respondent_name ?? null,
            respondent_email: r.respondent_email ?? null,
            respondent_phone: r.respondent_phone ?? null,
            score: r.score ?? null,
            answers_json: r.answers_json ?? r.answers,
            created_at: r.created_at
          }));
        setResponses(mapped);

        const questionBuckets = await Promise.all(
          mappedForms.map((form) =>
            api.get<any>(`/forms/${form.id}`).then((formData) => ({ id: form.id, questions: formData.questions || [] }))
          )
        );
        const map: Record<string, Record<string, string>> = {};
        questionBuckets.forEach((entry) => {
          const qMap: Record<string, string> = {};
          entry.questions.forEach((q: any) => {
            const key = String(q.id ?? q.question_id);
            qMap[key] = q.question_text ?? q.text ?? '';
          });
          map[String(entry.id)] = qMap;
        });
        setQuestionsMap(map);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

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

  const filteredResponses = responses.filter((r) => !selectedFormId || r.form_id === selectedFormId);

  const renderAnswers = (formId: string, answersJson: any) => {
    if (!answersJson) return null;
    const map = questionsMap[formId] || {};
    const entries = Object.entries(answersJson);
    if (!entries.length) return null;
    return (
      <div className="mt-4 space-y-2">
        {entries.map(([key, value]) => {
          const label = map[key] || `Pergunta ${key}`;
          const display = Array.isArray(value) ? value.join(', ') : String(value);
          return (
            <div key={key} className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-700">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">{label}</div>
              <div className="font-medium">{display || 'Sem resposta'}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const totalResponses = responses.length;

  return (
    <div className="space-y-6 animate-fadeIn font-sans pb-10">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/formularios/metricas')}
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Respostas</h1>
            <p className="text-sm text-slate-500">{totalResponses} respostas registradas</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Filter size={14} className="text-slate-400" />
          <select
            value={selectedFormId}
            onChange={(e) => setSelectedFormId(e.target.value)}
            className="text-sm font-semibold text-slate-700 bg-transparent outline-none"
          >
            <option value="">Todos os formularios</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>{form.title}</option>
            ))}
          </select>
          <ChevronDown size={16} className="text-slate-400" />
        </div>
      </div>

      {isLoading ? (
        <div className="text-slate-500">Carregando respostas...</div>
      ) : filteredResponses.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
          Nenhuma resposta registrada ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredResponses.map((res) => {
            const patientName = getPatientName(res.patient_id);
            const respondentLabel = patientName || res.respondent_name || 'Visitante';
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
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <FileText size={12} /> {res.form_title}
                      </p>
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

                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-bold text-indigo-600 flex items-center gap-2">
                    <FileText size={14} /> Ver respostas
                  </summary>
                  {renderAnswers(res.form_id, res.answers_json)}
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
