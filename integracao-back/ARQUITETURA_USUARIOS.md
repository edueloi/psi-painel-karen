
# Arquitetura de Usuários e Multitenancy

O sistema utiliza uma arquitetura **Multi-tenant** com isolamento lógico de dados. Isso significa que várias clínicas (Tenants) usam o mesmo banco de dados, mas cada registro (paciente, agendamento, prontuário) possui uma coluna `tenant_id` para garantir que uma clínica nunca veja os dados de outra.

## 1. Estrutura do Banco de Dados (Relacional)

### Tabela: `tenants`
Armazena as clínicas/empresas que contrataram o software.
*   `id`: UUID (Primary Key)
*   `name`: String (Nome da Clínica)
*   `plan_type`: String (Basic, Pro, Enterprise)
*   `status`: String (active, suspended)
*   `created_at`: Date

### Tabela: `users`
Armazena todos os usuários do sistema (Admins, Psicólogos, Secretárias).
*   `id`: UUID (PK)
*   `tenant_id`: UUID (FK -> tenants.id) - **CRUCIAL PARA ISOLAMENTO**
*   `email`: String (Unique)
*   `password_hash`: String
*   `role`: String (ADMIN, PSYCHOLOGIST, SECRETARY, SUPER_ADMIN)
*   `name`: String

## 2. Fluxo de Criação de Tenant (Super Admin)

Quando o Super Admin cria um "Novo Cliente" no painel, o backend deve executar uma **Transação Atômica** (tudo ou nada):

1.  **Criar Tenant:** Inserir registro na tabela `tenants` com os dados da empresa.
2.  **Criar Usuário Admin:** Inserir registro na tabela `users` usando o `id` do tenant recém-criado.
    *   `role` deve ser obrigatoriamente `ADMIN`.
    *   Esse usuário será o "dono" da conta.

**Payload Exemplo (POST /api/admin/tenants):**
```json
{
  "companyName": "Clínica Bem Viver",
  "plan": "annual",
  "adminUser": {
    "name": "Dr. João",
    "email": "joao@bemviver.com",
    "password": "senha_temporaria"
  }
}
```

## 3. Fluxo de Criação de Equipe (Admin da Clínica)

Quando o `joao@bemviver.com` loga e cria uma secretária:

1.  **Middleware de Autenticação:** Identifica que o João pertence ao `tenant_id: 123`.
2.  **Controller de Criação:** Recebe os dados da secretária.
3.  **Inserção:** O Backend **força** o `tenant_id` do novo usuário para ser `123`.
    *   *Segurança:* Nunca confie no `tenant_id` enviado pelo frontend nessa rota. Sempre pegue do token do usuário logado.

## 4. Isolamento de Dados (Middleware)

Todas as queries de busca (Pacientes, Agendamentos, Prontuários) devem ter um filtro automático (Scope) aplicado pelo ORM ou manualmente:

```sql
SELECT * FROM patients WHERE tenant_id = :current_user_tenant_id
```

Isso garante que, mesmo que um usuário tente acessar `/api/patients/999` (ID de outra clínica), o banco não retornará nada se o `tenant_id` não bater.
