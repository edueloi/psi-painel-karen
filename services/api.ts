
const BASE_URL = 'http://localhost:3013';

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

export const api: Api = {
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const token = localStorage.getItem('psi_token');
    
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
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
        throw new Error('Sessão expirada');
      }

      // Se a resposta for vazia (ex: 204 No Content), retornar objeto vazio
      if (response.status === 204) {
          return {} as T;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Erro ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (err: any) {
      console.error(`ERRO API [${config.method || 'GET'}] ${endpoint}:`, err);
      
      if (err.name === 'TypeError' && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
        throw new Error('Erro de Conexão: Não foi possível alcançar o servidor em ' + BASE_URL + '. Verifique se o backend está rodando, se o firewall permite a conexão e se o CORS está devidamente habilitado no Node.js.');
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

