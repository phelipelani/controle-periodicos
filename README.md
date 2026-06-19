# Controle de Periódicos

Sistema web para a administradora controlar os serviços periódicos obrigatórios de
cada condomínio: **dedetização, extintor, limpeza de reservatório, AVCB e seguro**.

- Login por usuário/senha (admin cadastra os gerentes e define o gerente de cada
  condomínio; o gerente só enxerga os condomínios sob sua responsabilidade).
- Cada condomínio tem seus 5 serviços, com cálculo automático de vencimento e painel
  de alertas (vencido / a vencer).
- Dedetização por **agendamento**: quando a data agendada chega, o sistema marca a
  realização automaticamente e recalcula o próximo vencimento.

Stack: **Node + Express + SQLite** (backend) e **React + Vite** (frontend).

## Onde os dados ficam (IMPORTANTE)

Tudo é gravado num **banco SQLite local** — um único arquivo `controle.db`. Não vai
para nuvem nenhuma; roda só na máquina onde o servidor está rodando.

⚠️ **Nunca deixe o banco dentro do OneDrive/Drive/Dropbox.** A sincronização mexe
no arquivo enquanto o app escreve e pode reverter/corromper os dados (sintoma:
"criei e sumiu"). Por isso o local do banco é configurável via `DB_DIR`.

**Configuração:** copie `server/.env.example` para `server/.env` e ajuste:

```
DB_DIR=C:\controle-periodicos-data    # pasta FORA do OneDrive (o banco é pequeno)
PORT=4000
```

O arquivo `server/.env` não vai para o git. Backup do banco = copiar `controle.db`.

## Como rodar em desenvolvimento

Pré-requisito: Node.js 18+ instalado.

```bash
# 1) instalar dependências (raiz + server + web)
npm run install:all

# 2) criar o server/.env (ver acima) apontando DB_DIR para fora do OneDrive

# 3) subir tudo (API em :4000, site em :5173 com recarregamento automático)
npm run dev
```

Abra **http://localhost:5173**.

## Rodar no PC servidor (acesso pela rede local)

No PC que ficará como servidor (onde o projeto será migrado quando estiver pronto):

```bash
npm run install:all          # uma vez
# criar server/.env com DB_DIR apontando para uma pasta local do servidor
npm run prod                 # compila o site e sobe um único processo (site + API)
```

O console mostra os endereços, por exemplo:

```
  • neste PC:      http://localhost:4000
  • na rede (LAN): http://192.168.0.79:4000
```

As outras máquinas da rede acessam pelo endereço **LAN** (ex.: `http://192.168.0.79:4000`).

Observações para o servidor:
- Libere a **porta 4000** no Firewall do Windows (entrada) para a rede privada.
- Para o serviço subir sozinho ao ligar o PC, dá para usar o Agendador de Tarefas
  do Windows (ou uma ferramenta como PM2/NSSM) chamando `npm start` na pasta do projeto.
- Sempre que atualizar o código do site, rode `npm run build` (ou `npm run prod`).

No **primeiro boot**, o servidor cria um usuário administrador e imprime no console:

```
==> Usuário admin criado: admin@local / senha: XXXXXXXX
```

Use essas credenciais para entrar, depois cadastre os gerentes e troque a senha.

## Estrutura

- `server/` — API Express + banco SQLite. O arquivo `controle.db` é criado sozinho
  na pasta definida em `DB_DIR` (ou em `server/data` se `DB_DIR` não for configurado).
- `web/` — interface React (Vite).

## Backup

Todo o banco fica em um único arquivo: `controle.db` (na pasta do `DB_DIR`). Para
backup, basta copiar esse arquivo.
