# Guia: Criando um Novo Instrumento Clínico

> Baseado na implementação do DASS-21. Siga esta ordem para não quebrar nada.

---

## Visão Geral da Arquitetura

Cada instrumento tem **4 partes**:

| Parte | Arquivo | Descrição |
|---|---|---|
| Formulário público | `pages/external/XxxPublic.tsx` | Paciente preenche pelo celular |
| Painel do profissional | `pages/clinical-tools/Xxx.tsx` | Psicólogo vê resultados |
| Rota pública (backend) | `backend/routes/public-profile.js` | GET/POST sem autenticação |
| SEO / OG tags | `backend/index.js` | Preview no WhatsApp/redes sociais |

---

## Passo 1 — Definir o identificador do instrumento

Escolha um `slug` em kebab-case. Ex: `dass-21`, `phq-9`, `gad-7`, `beck-ansiedade`.

Esse slug vai aparecer em:
- URL pública: `/f/dass-21`
- `tool_type` no banco: `dass-21`
- Rota do backend: `/public-profile/dass-21/:patientId`

---

## Passo 2 — Formulário Público (`pages/external/XxxPublic.tsx`)

### Estrutura básica

```tsx
import { api } from '../../services/api';
import { useSearchParams } from 'react-router-dom';

export const XxxPublic: React.FC = () => {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('p');       // ID do paciente
  const professionalId = searchParams.get('u');  // Share token do profissional
  // ...
};
```

### Buscar dados do profissional (para exibir nome/logo no header)

```tsx
useEffect(() => {
  if (professionalId) {
    api.get(`/public-profile/token/${professionalId}`)
      .then(setProfessional)
      .catch(() => {});
  }
}, [professionalId]);
```

### Envio das respostas — SEMPRE usar rota pública

```tsx
// ✅ CORRETO — rota pública, sem autenticação necessária
const uParam = professionalId ? `?u=${professionalId}` : '';

// Buscar histórico existente
const history = await api.get(`/public-profile/SEU-SLUG/${patientId}${uParam}`);

// Salvar novo resultado
await api.post(`/public-profile/SEU-SLUG/${patientId}${uParam}`, {
  data: [...history, novoResultado]
});

// ❌ ERRADO — rota protegida, vai dar 401 para paciente não autenticado
// await api.put(`/clinical-tools/${patientId}/seu-slug`, ...);
```

### Estrutura do objeto de resultado

```ts
const novoResultado = {
  id: Date.now(),
  date: new Date().toISOString(),
  answers: answers,        // Record<number, number> — respostas brutas
  scores: finalScores,     // objeto com pontuações calculadas
  origin: 'external'       // marcar que veio do paciente
};
```

---

## Passo 3 — Rota pública no backend (`backend/routes/public-profile.js`)

Adicionar **GET** (buscar histórico) e **POST** (salvar resultado) logo antes do `module.exports`:

```js
// GET /public-profile/SEU-SLUG/:patientId?u=TOKEN
router.get('/seu-slug/:patientId', async (req, res) => {
  try {
    const userId = resolveUserId(req.query.u);
    if (!userId) return res.status(400).json({ error: 'Token inválido.' });

    const [[user]] = await db.query('SELECT tenant_id FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Profissional não encontrado.' });

    const [rows] = await db.query(
      'SELECT data FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [req.params.patientId, 'seu-slug', user.tenant_id]
    );

    if (rows.length === 0) return res.json([]);
    let data = rows[0].data;
    try { data = JSON.parse(data); } catch {}
    res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('Erro ao buscar SEU-SLUG público:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /public-profile/SEU-SLUG/:patientId?u=TOKEN
router.post('/seu-slug/:patientId', async (req, res) => {
  try {
    const userId = resolveUserId(req.query.u);
    if (!userId) return res.status(400).json({ error: 'Token inválido.' });

    const [[user]] = await db.query('SELECT tenant_id FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Profissional não encontrado.' });

    const { data } = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Dados inválidos.' });

    const patientId = req.params.patientId;
    const str = JSON.stringify(data);

    const [rows] = await db.query(
      'SELECT id FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [patientId, 'seu-slug', user.tenant_id]
    );

    if (rows.length > 0) {
      await db.query('UPDATE clinical_tools SET data = ?, updated_at = NOW() WHERE id = ?', [str, rows[0].id]);
    } else {
      await db.query(
        'INSERT INTO clinical_tools (tenant_id, patient_id, professional_id, scope_key, tool_type, data) VALUES (?, ?, ?, ?, ?, ?)',
        [user.tenant_id, patientId, userId, patientId, 'seu-slug', str]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao salvar SEU-SLUG público:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});
```

> **O helper `resolveUserId` já existe no arquivo** — aceita share token (novo padrão) e ID numérico puro (retrocompatível com links antigos).

---

## Passo 4 — SEO / OG Tags no WhatsApp (`backend/index.js`)

Dentro da rota `app.get('/f/:hash', ...)`, existe o objeto `CLINICAL_TOOL_LABELS`. Adicione seu instrumento lá:

```js
const CLINICAL_TOOL_LABELS = {
  'dass-21': {
    title: 'DASS-21',
    description: 'Escala de Depressão, Ansiedade e Estresse (DASS-21). Avaliação clínica enviada pelo seu psicólogo(a). Clique para responder.'
  },
  // ✅ Adicione aqui o seu instrumento:
  'phq-9': {
    title: 'PHQ-9',
    description: 'Questionário de Saúde do Paciente (PHQ-9). Avaliação de sintomas depressivos enviada pelo seu psicólogo(a). Clique para responder.'
  },
};
```

Isso garante que ao compartilhar o link no WhatsApp/redes sociais apareça:
- **Título**: `PHQ-9 — Nome da Clínica`
- **Descrição**: o texto acima personalizado com o nome do profissional
- **Imagem**: logo da clínica ou avatar do profissional

---

## Passo 5 — Registrar a rota no frontend (`App.tsx`)

```tsx
import { XxxPublic } from './pages/external/XxxPublic';

// Dentro das rotas:
<Route path="/f/seu-slug" element={<XxxPublic />} />
```

---

## Passo 6 — Link de compartilhamento no painel (`pages/clinical-tools/Xxx.tsx`)

```tsx
const getShareLink = () => {
  const baseUrl = window.location.origin;
  // ✅ SEMPRE usar user?.shareToken, NUNCA user?.id
  return `${baseUrl}/f/seu-slug?u=${user?.shareToken}&p=${selectedPatientId}`;
};
```

> **Atenção**: usar `user?.id` (número puro) quebra o SEO e a submissão pública, pois o backend espera um share token HMAC. O `shareToken` vem do `AuthContext` e é gerado automaticamente pelo backend no login.

---

## Checklist — Novo Instrumento

- [ ] Slug definido (kebab-case, único)
- [ ] `pages/external/XxxPublic.tsx` criado
  - [ ] Lê `?p=` (patientId) e `?u=` (share token) da URL
  - [ ] Busca profissional via `/public-profile/token/:token`
  - [ ] GET e POST apontam para `/public-profile/seu-slug/:patientId`
  - [ ] Resultado salvo com `{ id, date, answers, scores, origin: 'external' }`
- [ ] Rotas GET + POST em `backend/routes/public-profile.js`
  - [ ] Usa `resolveUserId()` para o token
  - [ ] `tool_type` igual ao slug
- [ ] SEO adicionado em `CLINICAL_TOOL_LABELS` no `backend/index.js`
- [ ] Rota `/f/seu-slug` registrada no `App.tsx`
- [ ] `getShareLink()` usa `user?.shareToken` (não `user?.id`)

---

## Erros Comuns

| Erro | Causa | Solução |
|---|---|---|
| "Ocorreu um erro ao enviar" | Usando rota `/clinical-tools/` protegida | Trocar para `/public-profile/seu-slug/` |
| WhatsApp mostra preview genérico do PsiFlux | Instrumento não está em `CLINICAL_TOOL_LABELS` | Adicionar em `backend/index.js` |
| Token inválido (400) | `getShareLink()` usando `user?.id` em vez de `user?.shareToken` | Corrigir o link de compartilhamento |
| Histórico não carrega | `tool_type` no banco diverge do slug da rota | Garantir que são idênticos em todos os lugares |
| Modal "caído" ou com gap branco | `space-y-8` no elemento pai do Modal | Mover os Modais para fora do container `space-y-8` (usar `<> . . . </>`) |
| SEO funciona mas sem foto | `clinic_logo_url` ou `avatar_url` nulos no banco | Normal se o profissional não fez upload de logo |
