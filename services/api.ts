export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3013';
const BASE_URL = API_BASE_URL;

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
    const token = localStorage.getItem('psi_token');

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
        localStorage.removeItem('psi_token');
        window.location.href = '/login';
        throw new Error('Sessao expirada');
      }

      const data = await parseResponseBody(response);
      if (!response.ok) {
        const rawPreview = typeof data?.raw === 'string'
          ? data.raw.replace(/\s+/g, ' ').trim().slice(0, 140)
          : '';
        const message = data?.error
          || (rawPreview ? `Erro ${response.status}: resposta nao-JSON do servidor (${rawPreview})` : `Erro ${response.status}: ${response.statusText}`);
        throw new Error(message);
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
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },

  put<T>(endpoint: string, body: any): Promise<T> {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  },

  patch<T>(endpoint: string, body: any): Promise<T> {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  },

  delete<T>(endpoint: string): Promise<T> {
    return this.request(endpoint, { method: 'DELETE' });
  }
};
