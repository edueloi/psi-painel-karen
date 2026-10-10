import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { FormBuilder } from '../components/Forms/FormBuilder';
import { FormQuestion, InterpretationRule, FormTheme } from '../types';
import { PageWrapper, Alert } from '../components/UI';
import { Loader2 } from 'lucide-react';

type BuilderPayload = {
  title: string;
  description: string;
  category?: string;
  questions: FormQuestion[];
  interpretations?: InterpretationRule[];
  theme?: FormTheme;
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

        let theme = undefined;
        if (form.theme_json) {
          try {
            theme = typeof form.theme_json === 'string' ? JSON.parse(form.theme_json) : form.theme_json;
          } catch {
            theme = undefined;
          }
        }

        setInitialData({
          title: form.title || '',
          description: form.description || '',
          category: form.category || '',
          questions,
          interpretations,
          theme
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
      setNotice({ type: 'success', message: 'Formulário salvo com sucesso.' });
      await new Promise((resolve) => setTimeout(resolve, 600));
      navigate('/formularios/lista');
    } catch (e) {
      console.error(e);
      setNotice({ type: 'error', message: 'Não foi possível salvar o formulário.' });
    }
  };

  if (isLoading) {
    return (
      <PageWrapper>
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" />Carregando formulário...
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-4">
        {notice ? (
          <Alert variant={notice.type === 'success' ? 'success' : 'error'}>{notice.message}</Alert>
        ) : null}
        <FormBuilder
          initialData={initialData}
          onSave={handleSave}
          onCancel={() => navigate('/formularios/lista')}
        />
      </div>
    </PageWrapper>
  );
};
