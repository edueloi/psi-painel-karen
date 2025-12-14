
# Arquitetura de Usuários e Salas

O backend deve fornecer uma API REST para gerenciamento de dados e autenticação inicial, antes de estabelecer a conexão WebSocket.

## 1. Autenticação (JWT)

O sistema deve usar **JSON Web Tokens (JWT)**.
*   O Frontend envia o token no cabeçalho `Authorization: Bearer <token>`.
*   O Token deve conter: `userId`, `role` (admin, psychologist, patient), `name`.

## 2. Endpoints Necessários

### A. Usuários
*   `POST /api/auth/login`: Retorna JWT.
*   `POST /api/auth/register`: (Apenas Admin) Cria novos profissionais.
*   `POST /api/patients`: Cria perfil de paciente (gera credenciais de acesso simplificado).

### B. Agendamentos e Salas
*   `POST /api/appointments`: Cria um agendamento.
    *   *Retorno:* Deve incluir um `meetingId` único (UUID).
*   `GET /api/rooms/:meetingId/validate`:
    *   Verifica se a sala existe.
    *   Verifica se a data/hora permite entrada.
    *   Retorna as permissões do usuário atual (ex: `canDraw`, `canShareScreen`).

## 3. Fluxo de Entrada na Sala

1.  **Host (Psicólogo):**
    *   Entra na rota `/meeting/:id`.
    *   O Frontend valida o Token JWT.
    *   O Frontend conecta no Socket.io enviando `{ roomId: id, token: jwt }`.
    *   O Backend registra o socket como "HOST".

2.  **Convidado (Paciente):**
    *   Clica no link.
    *   Se não estiver logado, insere o nome (Guest).
    *   O Frontend conecta no Socket.io.
    *   **Bloqueio:** O Backend coloca o socket em um estado `waiting_room`.
    *   O Backend emite evento `guest-request-entry` para o Host.
    *   Host aprova -> Backend move socket para `room-channel`.

## 4. Segurança

*   **Validação de Socket:** O middleware do Socket.io deve ler o JWT para garantir que o usuário é quem diz ser.
*   **Isolamento:** Eventos de uma sala (`meetingId`) nunca devem vazar para outra. Use `socket.join(meetingId)`.
