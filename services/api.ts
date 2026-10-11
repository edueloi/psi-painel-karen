import { getToken, clearToken } from './tokenStorage';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3013';
const BASE_URL = API_BASE_URL;

export const getStaticUrl = (path?: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('data:')) return path;
  
  // Se o path já contém o prefixo da API (ex: /api), não duplicamos
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const apiUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  
  // Se o cleanPath já começa com o que está no final da apiUrl, evitamos duplicação
  // Ex: apiUrl = .../api, cleanPath = /api/uploads... -> result = .../api/uploads...
  const apiSuffix = apiUrl.split('/').pop() || '';
  if (apiSuffix && cleanPath.startsWith(`/${apiSuffix}/`)) {
    const rootUrl = apiUrl.split('/').slice(0, -1).join('/');
    return `${rootUrl}${cleanPath}`;
  }

  return `${apiUrl}${cleanPath}`;
};

/**
 * Arquivos clínicos não devem depender de um link aberto em nova aba: esse tipo
 * de navegação não envia o token Bearer e pode cair no middleware de autenticação.
 * Baixamos o blob com a sessão atual e deixamos a tela decidir se baixa ou exibe.
 */
export async function fetchAuthenticatedFile(endpoint: string): Promise<{ blob: Blob; filename: string | null }> {
  const token = getToken();
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const data = await parseResponseBody(response);
    throw new Error(data?.error || data?.message || 'Não foi possível acessar o arquivo.');
  }

  const disposition = response.headers.get('content-disposition') || '';
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const quotedName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const filename = encodedName ? decodeURIComponent(encodedName) : (quotedName || null);
  return { blob: await response.blob(), filename };
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

interface Api {
  request<T>(endpoint: string, options?: RequestOptions): Promise<T>;
  get<T>(endpoint: string, params?: Record<string, string>): Promise<T>;
  post<T>(endpoint: string, body: any): Promise<T>;
  put<T>(endpoint: string, body: any): Promise<T>;
  patch<T>(endpoint: string, body: any): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}

async function parseResponseBody(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';

  if (response.status === 204) {
    return {};
  }

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();

  if (!text) {
    return {};
  }

  return { raw: text, contentType };
}

export const api: Api = {
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const token = getToken();

    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    let url = `${BASE_URL}${endpoint}`;
    if (options.params) {
      const searchParams = new URLSearchParams(options.params);
      url += `?${searchParams.toString()}`;
    }

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        const isPublicPath = window.location.pathname.startsWith('/f/') ||
                           window.location.pathname.startsWith('/p/') ||
                           window.location.pathname.startsWith('/portal') ||
                           window.location.pathname === '/login' ||
                           window.location.pathname === '/';
        // Only force logout if the request was authenticated (had a token) and the server rejected it
        const hadToken = !!getToken();
        if (!isPublicPath && hadToken && endpoint.startsWith('/') && !endpoint.startsWith('/patient-portal') && !endpoint.startsWith('/virtual-rooms/public')) {
          clearToken();
          window.location.href = '/login';
        }
        throw new Error('Sessao expirada');
      }

      const data = await parseResponseBody(response);
      if (!response.ok) {
        const rawPreview = typeof data?.raw === 'string'
          ? data.raw.replace(/\s+/g, ' ').trim().slice(0, 140)
          : '';
        const message = (data?.message || (data?.error ? (data.detail ? `${data.error}: ${data.detail}` : data.error) : null))
          || (rawPreview ? `Erro ${response.status}: resposta nao-JSON do servidor (${rawPreview})` : `Erro ${response.status}: ${response.statusText}`);
        const err: any = new Error(message);
        err.status = response.status;
        err.data = data;
        if (data?.conflict) {
          err.conflict = true;
          err.conflict_id = data.conflict_id;
          err.prof_name = data.prof_name;
          err.start_time = data.start_time;
          err.end_time = data.end_time;
          console.warn('[conflict] id do agendamento conflitante:', data.conflict_id, 'start:', data.start_time, 'end:', data.end_time);
        }
        throw err;
      }

      return data as T;
    } catch (err: any) {
      console.error(`ERRO API [${config.method || 'GET'}] ${endpoint}:`, err);

      if (err.name === 'TypeError' && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
        throw new Error('Erro de conexao: nao foi possivel alcancar o servidor em ' + BASE_URL + '. Verifique se o backend esta rodando, se o firewall permite a conexao e se o CORS esta habilitado no Node.js.');
      }

      throw err;
    }
  },

  get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request(endpoint, { method: 'GET', params });
  },

  post<T>(endpoint: string, body: any): Promise<T> {
    return this.request(endpoint, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) });
  },

  put<T>(endpoint: string, body: any): Promise<T> {
    return this.request(endpoint, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) });
  },

  patch<T>(endpoint: string, body: any): Promise<T> {
    return this.request(endpoint, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) });
  },

  delete<T>(endpoint: string): Promise<T> {
    return this.request(endpoint, { method: 'DELETE' });
  }
};
