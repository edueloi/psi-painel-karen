
# Protocolo da Lousa Interativa (Whiteboard)

A lousa requer sincronização de baixa latência. Não usaremos WebRTC para os dados (embora seja possível via DataChannels) para manter a arquitetura mais simples e permitir persistência no servidor (salvar o desenho).

## 1. Estrutura de Dados

O desenho é composto por "paths" (caminhos). Não envie imagens inteiras (bitmaps), envie vetores/coordenadas.

**Objeto de Desenho:**
```json
{
  "type": "path",
  "x": 150.5,      // Coordenada X (normalizar entre 0-1 é melhor para telas diferentes, mas pixels funcionam se o canvas for fixo)
  "y": 300.2,      // Coordenada Y
  "color": "#FF0000",
  "width": 3,
  "isStarting": true // Indica se é o começo de uma nova linha (mousedown)
}
```

## 2. Persistência (Histórico)

Quando um usuário entra na sala atrasado, ele precisa ver o que já foi desenhado.
*   **Backend:** Deve manter um array em memória (Redis) com o histórico de traços daquela sala `history: []`.
*   **Ao Conectar:** Quando um usuário dá `join-room`, o servidor envia o evento `board-history` com todo o array acumulado.

## 3. Eventos Socket.io

### A. Desenhando
*   **Client envia:** `draw-start` { x, y, color }
    *   *Server:* Adiciona ao histórico. Emite `draw-start` para todos na sala (exceto remetente).
*   **Client envia:** `draw-move` { x, y, color }
    *   *Server:* Adiciona ao histórico. Emite `draw-move` para todos.
    *   *Otimização:* O Frontend deve usar `throttle` (ex: enviar a cada 10ms ou 20ms) para não sobrecarregar o socket com milhares de eventos por segundo.

### B. Ferramentas
*   **Client envia:** `board-clear`
    *   *Server:* Limpa o histórico em memória. Emite `board-clear` para todos.

### C. Companion Mode (Tablet)
Se o usuário usar um Tablet como lousa dedicada:
1.  Tablet entra na sala com query param `?mode=companion`.
2.  Backend identifica e permite que este socket emita eventos de desenho.
3.  Desktop do Psicólogo (Host) apenas "escuta" e renderiza o que o Tablet manda, ou vice-versa.

## 4. Adaptação para Telas Diferentes (Responsividade)

O maior desafio é sincronizar um desenho feito num celular com a tela de um desktop.

**Solução Recomendada:**
Use coordenadas relativas (porcentagem) no Backend.
*   Frontend (Tablet): Detecta toque em `x=500` numa tela de `1000px`. Envia `x_pct = 0.5`.
*   Frontend (Desktop): Recebe `x_pct = 0.5`. Sua tela tem `2000px`. Renderiza em `x=1000`.

*Nota: A implementação atual do React usa pixels absolutos para simplicidade. Para produção, migrar para coordenadas relativas.*
