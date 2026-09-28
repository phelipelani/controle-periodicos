# Guia de Configuração da Integração Microsoft OneDrive (Graph API)

Este documento orienta o passo a passo completo para configurar o armazenamento de arquivos do **Controle de Periódicos iMCOSTA** diretamente no **Microsoft OneDrive for Business** via **Microsoft Graph API**.

Com esta integração, o backend (Node.js) envia, lê e exclui arquivos na nuvem corporativa de forma nativa e segura, **sem depender do aplicativo OneDrive Desktop instalado e sem depender de nenhuma pasta física no servidor**.

---

## 📋 Sumário
1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Passo a Passo no Microsoft Entra ID (Azure Portal)](#2-passo-a-passo-no-microsoft-entra-id-azure-portal)
3. [Permissões Necessárias no Microsoft Graph](#3-permissões-necessárias-no-microsoft-graph)
4. [Identificação do Drive e da Conta](#4-identificação-do-drive-e-da-conta)
5. [Configuração do Arquivo `.env`](#5-configuração-do-arquivo-env)
6. [Validação e Teste da Conexão](#6-validação-e-teste-da-conexão)
7. [Diagnóstico de Erros Comuns](#7-diagnóstico-de-erros-comuns)
8. [Configuração em Produção (VPS / VPN / Linux / Windows Server)](#8-configuração-em-produção-vps--vpn--linux--windows-server)

---

## 1. Visão Geral da Arquitetura

```text
[Morador / Usuário]
        ↓ (multipart/form-data)
[Frontend React SPA]
        ↓ (/api/upload/...)
[Backend Node.js / Express]
        ↓ (Buffer em memória)
[Storage Service] (Camada de Abstração)
        ↓
[OneDrive Service] (@microsoft/microsoft-graph-client + @azure/identity)
        ↓ (OAuth 2.0 Client Credentials Flow - HTTPS)
[Microsoft Graph API] (graph.microsoft.com)
        ↓
[OneDrive Corporativo da iMCOSTA] (CONDOMÍNIOS/...)
```

---

## 2. Passo a Passo no Microsoft Entra ID (Azure Portal)

Para autenticar a aplicação sem depender de login interativo de usuário (execução server-to-server / daemon), utilizamos o fluxo **Client Credentials Grant** (OAuth 2.0).

### Passo 1: Acessar o Portal do Azure
1. Acesse [portal.azure.com](https://portal.azure.com/) ou [entra.microsoft.com](https://entra.microsoft.com/) com a conta de administrador da empresa.
2. No menu de busca, pesquise por **Microsoft Entra ID** (antigo Azure Active Directory).

### Passo 2: Criar o Registro de Aplicativo (App Registration)
1. No menu lateral esquerdo, clique em **Registros de aplicativo** (*App registrations*).
2. Clique no botão **+ Novo registro** (*+ New registration*).
3. Preencha os campos:
   - **Nome**: `iMCOSTA - Controle de Periodicos Storage`
   - **Tipos de conta com suporte**: `Contas apenas neste diretório organizacional (Locatário único / Single tenant)`
   - **URI de Redirecionamento**: Deixe em branco (não é necessário para fluxo de serviço/daemon).
4. Clique em **Registrar** (*Register*).

### Passo 3: Coletar as Identificações Básicas
Na página **Visão Geral** (*Overview*) do aplicativo recém-criado, copie e guarde:
- **ID do diretório (locatário)** / `Directory (tenant) ID` -> Corresponde a `MICROSOFT_TENANT_ID`.
- **ID do aplicativo (cliente)** / `Application (client) ID` -> Corresponde a `MICROSOFT_CLIENT_ID`.

### Passo 4: Criar o Segredo do Cliente (Client Secret)
1. No menu lateral do aplicativo, clique em **Certificados e segredos** (*Certificates & secrets*).
2. Na aba **Segredos do cliente** (*Client secrets*), clique em **+ Novo segredo do cliente** (*+ New client secret*).
3. Informe uma descrição (ex: `Chave Producao Backend`) e escolha a validade (ex: 24 meses).
4. Clique em **Adicionar** (*Add*).
5. ⚠️ **IMPORTANTE**: Copie imediatamente o **Valor** (*Value*) gerado (e não o ID do segredo). Este valor só é exibido uma única vez!
   - Guarde-o como `MICROSOFT_CLIENT_SECRET`.

---

## 3. Permissões Necessárias no Microsoft Graph

A aplicação precisa de permissão em nível de aplicativo (*Application Permission*) para gerenciar arquivos na nuvem da empresa.

1. No menu lateral do registro do aplicativo, clique em **Permissões de API** (*API permissions*).
2. Clique em **+ Adicionar uma permissão** (*+ Add a permission*).
3. Selecione **Microsoft Graph**.
4. Selecione **Permissões do aplicativo** (*Application permissions* — **NÃO** use permissões delegadas).
5. Procure e marque a permissão:
   - **`Files.ReadWrite.All`** (Permite ler, criar, atualizar e excluir arquivos em todos os drives organizacionais com base nos identificadores autorizados).
6. Clique em **Adicionar permissões** (*Add permissions*).

### 🔑 Conceder Consentimento de Administrador:
7. Na mesma tela de permissões de API, clique no botão **Conceder consentimento do administrador para [Sua Empresa]** (*Grant admin consent for...*).
8. Confirme clicando em **Sim**.
9. Verifique se o status da permissão `Files.ReadWrite.All` ficou com uma marca verde de **Concedido** (*Granted*).

---

## 4. Identificação do Drive e da Conta

Para que o backend saiba exatamente em qual OneDrive os arquivos devem ser salvos:

- **Opção A (Mais Comum e Recomendada)**: Usar o e-mail da conta proprietária do OneDrive:
  ```env
  ONEDRIVE_USER_ID=leandro@imcosta.com.br
  ```
  *(O Graph API acessará automaticamente `/users/leandro@imcosta.com.br/drive`).*

- **Opção B**: Usar o Drive ID específico (obtido via Graph Explorer ou API):
  ```env
  ONEDRIVE_DRIVE_ID=b!abcdef...
  ```

- **Pasta Raiz**:
  ```env
  ONEDRIVE_ROOT_FOLDER=CONDOMÍNIOS
  ```
  O sistema criará automaticamente as subpastas:
  - `CONDOMÍNIOS/DEDETIZAÇÃO/[ANO]/[CODIGO]/`
  - `CONDOMÍNIOS/SEGUROS/[ANO]/[CODIGO]/`
  - `CONDOMÍNIOS/AVCB/[ANO]/[CODIGO]/`
  - `CONDOMÍNIOS/SPDA/[ANO]/[CODIGO]/`
  - `CONDOMÍNIOS/IMAGENS/`

---

## 5. Configuração do Arquivo `.env`

No servidor (ou ambiente local), edite o arquivo `server/.env`:

```ini
# ============================================================
# Banco de Dados Local (SQLite WAL)
# ============================================================
DB_DIR=C:\controle-periodicos-data
PORT=4000
JWT_SECRET=coloque-uma-chave-secreta-forte-aqui-2026
ADMIN_SENHA=admin123

# ============================================================
# Microsoft OneDrive via Graph API (Armazenamento na Nuvem)
# ============================================================
MICROSOFT_TENANT_ID=00000000-0000-0000-0000-000000000000
MICROSOFT_CLIENT_ID=11111111-1111-1111-1111-111111111111
MICROSOFT_CLIENT_SECRET=sua_chave_secreta_obtida_no_azure_portal

# Identificador da conta (email da conta do OneDrive) ou Drive ID
ONEDRIVE_USER_ID=leandro@imcosta.com.br

# Pasta base no OneDrive
ONEDRIVE_ROOT_FOLDER=CONDOMÍNIOS
```

---

## 6. Validação e Teste da Conexão

### Teste Rápido via API
Com o servidor rodando, faça uma requisição para a rota de diagnóstico de storage:

```bash
# Via navegador ou curl:
curl http://localhost:4000/api/upload/status
```

**Resposta esperada de sucesso:**
```json
{
  "ok": true,
  "configurado": true,
  "driveId": "b!...",
  "driveName": "OneDrive",
  "driveType": "business",
  "owner": "Leandro Costa",
  "rootFolder": "CONDOMÍNIOS"
}
```

---

## 7. Diagnóstico de Erros Comuns

| Código / Erro | Causa Provável | Solução |
| :--- | :--- | :--- |
| **`401 Unauthorized`** | `MICROSOFT_CLIENT_SECRET` incorreto, expirado ou `MICROSOFT_TENANT_ID` inválido. | Verifique se copiou o *Value* do segredo e se o Tenant ID está correto no `.env`. |
| **`403 Forbidden`** | Falta de permissão `Files.ReadWrite.All` ou falta do **Consentimento de Administrador**. | Vá em *API permissions* no Azure Portal e clique em *Grant admin consent*. |
| **`404 ItemNotFound / UserNotFound`** | `ONEDRIVE_USER_ID` incorreto ou o usuário não possui uma licença ativa do OneDrive. | Verifique a grafia do e-mail do usuário no Microsoft 365. |
| **`429 TooManyRequests`** | Limite de taxa temporário da Microsoft Graph API. | O sistema já realiza uploads otimizados; aguarde alguns segundos. |
| **Fallback Local Ativo** | Variáveis `MICROSOFT_*` não preenchidas no `.env`. | O sistema funciona normalmente salvando em pasta local até que as credenciais do Azure sejam preenchidas. |

---

## 8. Configuração em Produção (VPS / VPN / Linux / Windows Server)

Em qualquer servidor remoto (Linux Ubuntu, Debian, Windows Server, Docker):

1. Clone o repositório no servidor.
2. Crie o `server/.env` preenchendo as variáveis `MICROSOFT_*` e `ONEDRIVE_USER_ID`.
3. O servidor não precisa de nenhum aplicativo OneDrive Desktop nem de nenhuma pasta física do computador de desenvolvimento.
4. Ao rodar `npm run prod` ou `pm2 start server/src/index.js`, todos os uploads feitos por qualquer gerente, morador ou administrador serão enviados e lidos diretamente na nuvem corporativa da Microsoft.
