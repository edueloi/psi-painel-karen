import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { FormBuilder } from '../components/Forms/FormBuilder';
import { FormQuestion, InterpretationRule } from '../types';

type BuilderPayload = {
  title: string;
  description: string;
  questions: FormQuestion[];
  interpretations?: InterpretationRule[];
};

export const FormEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [initialData, setInitialData] = useState<BuilderPayload | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const loadForm = async () => {
      if (!isEditing || !id) return;
      setIsLoading(true);
      try {
        const form = await api.get<any>(`/forms/${id}`);
        const questions = (form.questions || []).map((q: any, index: number) => {
          const rawOptions = q.options_json ?? q.options;
          let options = [];
          if (Array.isArray(rawOptions)) {
            options = rawOptions;
          } else if (typeof rawOptions === 'string' && rawOptions.trim()) {
            try {
              options = JSON.parse(rawOptions);
            } catch {
              options = [];
            }
          }
          return {
            id: String(q.id ?? q.question_id ?? index),
            type: q.question_type ?? q.type ?? 'text',
            text: q.question_text ?? q.text ?? '',
            required: Boolean(q.is_required ?? q.required),
            options
          } as FormQuestion;
        });
        const interpretations = (form.interpretations || []).map((r: any, index: number) => ({
          id: String(r.id ?? index),
          minScore: r.min_score ?? r.minScore ?? 0,
          maxScore: r.max_score ?? r.maxScore ?? 0,
          resultTitle: r.result_title ?? r.resultTitle ?? '',
          description: r.description ?? '',
          color: r.color ?? 'bg-slate-100 text-slate-800'
        })) as InterpretationRule[];

        setInitialData({
          title: form.title || '',
          description: form.description || '',
          questions,
          interpretations
        });
      } catch (e) {
        console.error(e);
        navigate('/formularios/lista');
      } finally {
        setIsLoading(false);
      }
    };
    loadForm();
  }, [id, isEditing, navigate]);

  const handleSave = async (payload: BuilderPayload) => {
    try {
      if (isEditing && id) {
        await api.put(`/forms/${id}`, payload);
      } else {
        await api.post('/forms', payload);
      }
      setNotice({ type: 'success', message: 'Formulario salvo com sucesso.' });
      setTimeout(() => navigate('/formularios/lista'), 600);
    } catch (e) {
      console.error(e);
      setNotice({ type: 'error', message: 'Nao foi possivel salvar o formulario.' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-500">
        Carregando formulario...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <div
          className={`px-4 py-3 rounded-2xl font-bold text-sm border ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {notice.message}
        </div>
      ) : null}
      <FormBuilder
        initialData={initialData}
        onSave={handleSave}
        onCancel={() => navigate('/formularios/lista')}
      />
    </div>
  );
};
