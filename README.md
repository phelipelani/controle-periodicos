# Controle de Periódicos — iMCOSTA Administradora

Sistema web para gestão, controle e automação dos serviços periódicos obrigatórios de condomínios: **Dedetização, Extintores, Limpeza de Reservatório, AVCB e Seguros**.

---

## 📋 Sumário
1. [Visão Geral e Arquitetura](#-visão-geral-e-arquitetura)
2. [Roteamento e Portabilidade (VPN / Produção)](#-roteamento-e-portabilidade-vpn--produção)
3. [Armazenamento de Dados e Arquivos (DB_DIR vs NUVEM_DIR)](#-armazenamento-de-dados-e-arquivos-db_dir-vs-nuvem_dir)
4. [Leitura Inteligente de Documentos (OCR e IA)](#-leitura-inteligente-de-documentos-ocr-e-ia)
5. [Variáveis de Ambiente (.env)](#-variáveis-de-ambiente-env)
6. [Passo a Passo de Instalação e Deploy](#-passo-a-passo-de-instalação-e-deploy)
7. [Execução em Segundo Plano (PM2 / NSSM)](#-execução-em-segundo-plano-pm2--nssm)
8. [Configuração de Proxy Reverso (Nginx / Apache / IIS)](#-configuração-de-proxy-reverso-nginx--apache--iis)
9. [Tarefas Agendadas (Cron Jobs)](#-tarefas-agendadas-cron-jobs)
10. [Rotina de Backup](#-rotina-de-backup)

---

## 🏛️ Visão Geral e Arquitetura

O sistema é dividido em duas camadas principais mantidas no mesmo repositório:

- **Backend (`server/`)**: Node.js com Express, SQLite3 (modo WAL de alta performance e concorrência) e autenticação JWT.
- **Frontend (`web/`)**: Single Page Application (SPA) em React com Tailwind CSS, Lucide Icons, Vite e suporte Mobile First responsivo.
- **Motor OCR / Parser Inteligente**: Extração de PDFs digitais e escaneados utilizando pdf-parse, Tesseract OCR (Português/Inglês) e integração opcional com Google Gemini AI para extração estruturada de apólices e certificados.

---

## 🌐 Roteamento e Portabilidade (VPN / Produção)

O sistema foi arquitetado para ser **100% agnóstico de ambiente**. Não há URLs hardcoded de `localhost` no código da aplicação.

### 1. Chamadas de API do Frontend
Todas as requisições do frontend utilizam **caminhos relativos**:
```javascript
// Exemplo em web/src/api.js
const res = await fetch('/api' + url, options);
```
Isso significa que, independentemente do domínio, subdomínio, IP da VPN ou porta de acesso, a requisição sempre vai automaticamente para o mesmo host que serviu a página web.

### 2. Servidor Unificado em Produção
Em produção (`npm run prod` ou `node server/src/index.js`), o backend Express:
1. Serve as rotas de API em `/api/*`.
2. Serve todos os arquivos estáticos compilados do React em `web/dist/`.
3. Redireciona qualquer rota de página não encontrada para `web/dist/index.html` (SPA fallback).

**Resultado:** Todo o sistema roda sob uma **única porta** (padrão `4000`), sem necessidade de configurar CORS ou lidar com múltiplas portas na VPN.

### 3. Links Públicos de Adesão de Moradores
A página pública de adesão de moradores (`/adesao/:token`) gera o link de compartilhamento dinamicamente via:
```javascript
const shareUrl = `${window.location.origin}/adesao/${token}`;
```
Portanto, o link gerado se ajusta automaticamente para o IP da VPN (ex: `http://10.0.0.50:4000/adesao/...`), domínio interno ou HTTPS público da empresa.

---

## 💾 Armazenamento de Dados e Arquivos (DB_DIR vs NUVEM_DIR)

Existe uma separação estrita entre o **Banco de Dados Relacional** e o **Armazenamento de Arquivos/PDFs**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             ARMAZENAMENTO                               │
├───────────────────────────────────┬─────────────────────────────────────┤
│ 1. BANCO DE DADOS (DB_DIR)        │ 2. ARQUIVOS E ANEXOS (NUVEM_DIR)    │
│ • Arquivo: controle.db            │ • PDFs de Apólices e Certificados   │
│ • DEVE FICAR EM DISCO LOCAL       │ • PODE FICAR EM ONEDRIVE / REDE     │
│ • Ex: C:\controle-periodicos-data │ • Ex: C:\OneDrive\CONDOMÍNIOS       │
│ • Rápido, seguro, sem conflito    │ • Organização automática em pastas  │
└───────────────────────────────────┴─────────────────────────────────────┘
```

### 1. Banco de Dados SQLite (`DB_DIR`)
- ⚠️ **REGRA CRÍTICA**: O arquivo `controle.db` **NÃO DEVE** ser colocado dentro de pastas sincronizadas por nuvem (OneDrive, Dropbox, Google Drive). Softwares de sincronização travam os arquivos `-wal` e `-shm` do SQLite durante escritas, causando corrupção ou regressão de dados.
- Configure `DB_DIR` apontando para uma pasta no disco local do servidor (ex.: `C:\controle-periodicos-data` no Windows ou `/var/lib/controle-periodicos` no Linux).

### 2. Armazenamento de Arquivos em Nuvem / Rede (`NUVEM_DIR`)
- Os arquivos anexados (PDFs de apólices, certificados de dedetização, comprovantes) são salvos na pasta configurada em `NUVEM_DIR`.
- Pode ser uma pasta do **OneDrive Corporativo**, **Google Drive Desktop** ou **compartilhamento de rede (SMB/NAS)**.
- O sistema organiza e cria as subpastas automaticamente na seguinte estrutura:
  ```
  [NUVEM_DIR]/
  ├── DEDETIZAÇÃO/
  │   └── [ANO]/
  │       └── [CODIGO_CONDOMINIO]/
  │           └── [timestamp]_[nome_arquivo].pdf
  └── SEGUROS/
      └── [ANO]/
          └── [CODIGO_CONDOMINIO]/
              └── [timestamp]_[nome_arquivo].pdf
  ```
- Se `NUVEM_DIR` não for configurado ou não estiver acessível, o sistema salva automaticamente em `server/data/uploads/` com aviso no log do servidor.

---

## 🧠 Leitura Inteligente de Documentos (OCR e IA)

O sistema conta com pipeline híbrido de extração de dados para apólices de seguro e laudos:

1. **Parser Nativo de PDF (`pdf-parse`)**: Extrai texto diretamente de PDFs gerados digitalmente (vetoriais).
2. **OCR com Tesseract (`tesseract.js`)**: Caso o PDF seja escaneado ou uma foto, o sistema converte as páginas em imagens de alta resolução e processa via OCR em Português.
3. **Extração com Gemini IA (Opcional)**: Se a chave `GEMINI_API_KEY` for informada no `.env`, o sistema utiliza o modelo Google Gemini para interpretar apólices complexas (identificando Seguradora, Coberturas, Franquia, Vigência e Prêmio com altíssima precisão). Caso a chave não esteja presente, o sistema usa o parser regex local sem interromper o fluxo.

---

## ⚙️ Variáveis de Ambiente (.env)

Crie o arquivo `server/.env` a partir de `server/.env.example`:

```ini
# Porta HTTP da aplicação (backend + frontend integrados)
PORT=4000

# Diretório do Banco de Dados SQLite (OBRIGATÓRIO ser em disco local, FORA do OneDrive)
DB_DIR=C:\controle-periodicos-data

# Diretório raiz para upload e organização de PDFs (pode ser OneDrive / Rede)
NUVEM_DIR=C:\Users\Administrador\OneDrive - IMCosta Administradora\CONDOMÍNIOS

# Chave secreta para assinatura dos tokens JWT de autenticação
JWT_SECRET=sua_chave_secreta_longa_e_aleatoria_aqui_gerada_em_producao

# Senha padrão do administrador inicial (admin@local)
ADMIN_SENHA=admin123

# Opcional: Chave da API Google Gemini para OCR avançado de apólices
# GEMINI_API_KEY=AIzaSy...
```

---

## 🚀 Passo a Passo de Instalação e Deploy

Siga os passos abaixo no servidor de destino (Windows Server ou Linux):

### 1. Pré-requisitos
- **Node.js**: Versão 18.x LTS ou superior ([nodejs.org](https://nodejs.org/)).
- **Git** instalado.

### 2. Clonar o Repositório e Instalar Dependências
```bash
git clone https://github.com/phelipelani/controle-periodicos.git
cd controle-periodicos

# Instala as dependências da raiz, do backend e do frontend:
npm run install:all
```

### 3. Configurar Variáveis de Ambiente
```bash
# Copie o template
cp server/.env.example server/.env

# Edite o arquivo com o bloco de notas ou editor de sua preferência
# Configure DB_DIR e NUVEM_DIR de acordo com os caminhos do servidor
```

### 4. Criar a Pasta de Dados Local
Certifique-se de que a pasta definida em `DB_DIR` existe e tem permissão de leitura/escrita:
```bash
mkdir C:\controle-periodicos-data
```

### 5. Compilar o Frontend e Iniciar a Aplicação
```bash
# Compila a SPA React (gera os arquivos em web/dist)
npm run build

# Inicia o servidor de produção
npm start
```

Ao iniciar pela primeira vez, o banco `controle.db` será criado e as migrações serão executadas automaticamente. O console exibirá:
```
==================================================
  CONTROLE DE PERIÓDICOS - iMCOSTA
==================================================
  • Banco SQLite: C:\controle-periodicos-data\controle.db (WAL mode)
  • Pasta Nuvem:  C:\...\OneDrive\CONDOMÍNIOS
  • Servidor em:  http://localhost:4000
  • Rede local:   http://192.168.x.x:4000 (ou IP da VPN)
==================================================
==> Usuário admin criado: admin@local / senha: [ADMIN_SENHA]
```

---

## 🛡️ Execução em Segundo Plano (PM2 / NSSM)

Para garantir que o serviço permaneça ativo após reinicializações do servidor:

### Opção A: Usando PM2 (Recomendado)
```bash
# Instalar o PM2 globalmente
npm install -g pm2

# Na pasta raiz do projeto, iniciar o processo:
pm2 start server/src/index.js --name "controle-periodicos"

# Salvar o estado do PM2 para subir no boot
pm2 save
pm2 startup
```

### Opção B: Windows Service com NSSM
1. Baixe o NSSM ([nssm.cc](https://nssm.cc/)).
2. Execute no PowerShell como Administrador:
   ```cmd
   nssm install ControlePeriodicos "C:\Program Files\nodejs\node.exe" "C:\caminho\do\projeto\server\src\index.js"
   nssm set ControlePeriodicos AppDirectory "C:\caminho\do\projeto"
   nssm start ControlePeriodicos
   ```

### Opção C: Firewall do Windows
Libere a porta 4000 no Firewall do Windows para conexões de entrada na rede privada / VPN:
```powershell
New-NetFirewallRule -DisplayName "Controle Periodicos (Porta 4000)" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
```

---

## 🔀 Configuração de Proxy Reverso (Nginx / Apache / IIS)

Caso o sistema seja exposto através de um subdomínio com HTTPS (ex: `https://periodicos.imcosta.com.br` ou dentro de uma VPN com Nginx):

### Exemplo de Configuração Nginx:
```nginx
server {
    listen 80;
    server_name periodicos.imcosta.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name periodicos.imcosta.com.br;

    ssl_certificate     /etc/ssl/certs/imcosta.crt;
    ssl_certificate_key /etc/ssl/private/imcosta.key;

    # Limite de tamanho para upload de PDFs de seguros e laudos
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## ⏰ Tarefas Agendadas (Cron Jobs)

O backend possui rotinas internas com `node-cron` que executam automaticamente:

1. **Dedetizações Agendadas**: Diariamente à meia-noite, verifica se a data do agendamento chegou. Caso tenha chegado, marca a realização do serviço e recalcula automaticamente o próximo vencimento.
2. **Alertas de Vencimento**: Atualiza os indicadores de serviços vencidos ou a vencer em 30/60 dias.
3. **Expiração de Links de Adesão**: Tokens de adesão pública expiram automaticamente após a data limite configurada na campanha.

---

## 💾 Rotina de Backup

O banco de dados SQLite fica inteiramente contido no arquivo `controle.db` (e seus arquivos temporários `-wal` e `-shm`).

### Script de Backup Diário (PowerShell / Windows Task Scheduler)
Crie um arquivo `backup.ps1` agendado para rodar diariamente:
```powershell
$Data = Get-Date -Format "yyyy-MM-dd"
$Origem = "C:\controle-periodicos-data\controle.db"
$Destino = "C:\Backups\controle_periodicos_$Data.db"

# Cópia segura usando API SQLite Online Backup se preferir, ou cópia direta:
Copy-Item -Path $Origem -Destination $Destino -Force
Write-Host "Backup concluído com sucesso em $Destino"
```

---

## 📞 Suporte e Contato

Em caso de dúvidas sobre regras de negócio, integrações ou deploy, consulte o time de TI e desenvolvimento da **iMCOSTA Administradora**.

