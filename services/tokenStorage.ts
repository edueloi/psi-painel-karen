// "Lembrar-me neste dispositivo" precisa realmente decidir onde o token fica:
// localStorage sobrevive a fechar o navegador (login persiste); sessionStorage
// é apagado ao fechar a aba/janela (login vale só pra aquela sessão). Antes a
// checkbox só pré-preenchia o campo de e-mail — não afetava o login em si.
const TOKEN_KEY = 'psi_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, remember: boolean): void {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
