const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

// Local do banco. Por padrão fica em server/data, mas DEVE ser configurado via
// DB_DIR para uma pasta FORA de serviços de sincronização (OneDrive/Drive/Dropbox),
// senão o sync pode corromper/reverter o arquivo enquanto o app escreve.
// Ex.: DB_DIR=C:\controle-periodicos-data
const dataDir = process.env.DB_DIR
  ? path.resolve(process.env.DB_DIR)
  : path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'controle.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
console.log(`[db] Banco de dados em: ${dbPath}`);

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      papel TEXT NOT NULL DEFAULT 'gerente',
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS condominios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      endereco TEXT,
      observacoes TEXT,
      gerente_id INTEGER REFERENCES usuarios(id),
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS servicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chave TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      tipo_controle TEXT NOT NULL DEFAULT 'periodico',
      periodicidade_meses INTEGER,
      alerta_dias_antes INTEGER NOT NULL DEFAULT 30,
      ordem INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS condominio_servicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      condominio_id INTEGER NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
      servico_id INTEGER NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
      ultima_realizacao TEXT,
      data_vencimento TEXT,
      periodicidade_meses_override INTEGER,
      observacoes TEXT,
      UNIQUE (condominio_id, servico_id)
    );

    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      condominio_id INTEGER NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
      servico_id INTEGER NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
      data_agendada TEXT NOT NULL,
      periodo TEXT,
      status TEXT NOT NULL DEFAULT 'agendado',
      empresa TEXT,
      observacao TEXT,
      criado_por INTEGER REFERENCES usuarios(id),
      processado_em TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS historico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      condominio_servico_id INTEGER NOT NULL REFERENCES condominio_servicos(id) ON DELETE CASCADE,
      data_realizacao TEXT NOT NULL,
      data_vencimento TEXT,
      empresa TEXT,
      registrado_por INTEGER REFERENCES usuarios(id),
      origem TEXT NOT NULL DEFAULT 'manual',
      observacao TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

const SERVICOS_PADRAO = [
  { chave: 'dedetizacao', nome: 'Dedetização', tipo_controle: 'periodico', periodicidade_meses: 6, ordem: 1 },
  { chave: 'reservatorio', nome: 'Limpeza de reservatório', tipo_controle: 'periodico', periodicidade_meses: 6, ordem: 2 },
  { chave: 'extintor', nome: 'Extintor (recarga)', tipo_controle: 'periodico', periodicidade_meses: 12, ordem: 3 },
  { chave: 'avcb', nome: 'AVCB', tipo_controle: 'validade', periodicidade_meses: null, ordem: 4 },
  { chave: 'seguro', nome: 'Seguro', tipo_controle: 'validade', periodicidade_meses: null, ordem: 5 },
];

function seed() {
  const insertServico = db.prepare(`
    INSERT OR IGNORE INTO servicos (chave, nome, tipo_controle, periodicidade_meses, alerta_dias_antes, ordem)
    VALUES (@chave, @nome, @tipo_controle, @periodicidade_meses, 30, @ordem)
  `);
  for (const s of SERVICOS_PADRAO) insertServico.run(s);

  const totalUsuarios = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n;
  if (totalUsuarios === 0) {
    // Senha padrão fixa para o primeiro acesso (troque depois na tela de Usuários).
    // Pode ser sobrescrita via variável de ambiente ADMIN_SENHA.
    const senha = process.env.ADMIN_SENHA || 'admin123';
    const hash = bcrypt.hashSync(senha, 10);
    db.prepare(`
      INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, 'admin')
    `).run('Administrador', 'admin@local', hash);
    console.log('\n===========================================================');
    console.log(`  Usuário admin criado: admin@local / senha: ${senha}`);
    console.log('  (troque a senha após o primeiro acesso)');
    console.log('===========================================================\n');
  }
}

migrate();
seed();

module.exports = db;
