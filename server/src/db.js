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
      imagem TEXT,
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
      anexo TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS extintores_detalhes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      condominio_id INTEGER NOT NULL UNIQUE REFERENCES condominios(id) ON DELETE CASCADE,
      data_ultima_recarga TEXT,
      data_proximo_vencimento TEXT,
      data_ultimo_teste_hidrostatico TEXT,
      observacoes TEXT,
      anexo TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS extintores_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      extintor_detalhe_id INTEGER NOT NULL REFERENCES extintores_detalhes(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reservatorios_detalhes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      condominio_id INTEGER NOT NULL UNIQUE REFERENCES condominios(id) ON DELETE CASCADE,
      data_ultima_limpeza TEXT,
      data_proximo_vencimento TEXT,
      capacidade_litros INTEGER,
      observacoes TEXT,
      anexo TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS seguros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      condominio_id INTEGER NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
      seguradora TEXT,
      corretora TEXT,
      numero_apolice TEXT,
      data_renovacao TEXT,
      data_validade TEXT,
      status TEXT,
      observacoes TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
      atualizado_por INTEGER REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS seguro_coberturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seguro_id INTEGER NOT NULL REFERENCES seguros(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      nome_personalizado TEXT,
      valor_por_imovel REAL,
      quantidade_imoveis INTEGER,
      valor_segurado REAL,
      valor_total_calculado REAL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS seguro_sinistros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seguro_id INTEGER NOT NULL REFERENCES seguros(id) ON DELETE CASCADE,
      condominio_id INTEGER NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      cobertura_acionada TEXT,
      descricao TEXT,
      valor_reclamado REAL,
      status TEXT NOT NULL DEFAULT 'Aberto',
      observacoes TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
      registrado_por INTEGER REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS seguro_documentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seguro_id INTEGER NOT NULL REFERENCES seguros(id) ON DELETE CASCADE,
      sinistro_id INTEGER REFERENCES seguro_sinistros(id) ON DELETE SET NULL,
      nome_arquivo TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'Apólice',
      tamanho INTEGER,
      ano INTEGER,
      caminho TEXT NOT NULL,
      url TEXT,
      uploaded_by INTEGER REFERENCES usuarios(id),
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Add anexo column if it doesn't exist
  try {
    db.exec('ALTER TABLE historico ADD COLUMN anexo TEXT');
  } catch (e) {
    // Ignore if column already exists
  }

  // Add imagem column if it doesn't exist
  try {
    db.exec('ALTER TABLE condominios ADD COLUMN imagem TEXT');
  } catch (e) {
    // Ignore if column already exists
  }

  // Add structural columns to condominios
  const colunasCondominio = [
    'ALTER TABLE condominios ADD COLUMN cnpj TEXT',
    'ALTER TABLE condominios ADD COLUMN email TEXT',
    'ALTER TABLE condominios ADD COLUMN telefone TEXT',
    'ALTER TABLE condominios ADD COLUMN endereco_correspondencia TEXT',
    'ALTER TABLE condominios ADD COLUMN bairro TEXT',
    'ALTER TABLE condominios ADD COLUMN cep TEXT',
    'ALTER TABLE condominios ADD COLUMN cidade TEXT',
    'ALTER TABLE condominios ADD COLUMN uf TEXT',
    'ALTER TABLE condominios ADD COLUMN quantidade_apartamentos INTEGER',
    'ALTER TABLE condominios ADD COLUMN tipo TEXT DEFAULT "Vertical"',
    'ALTER TABLE condominios ADD COLUMN tem_elevador INTEGER DEFAULT 1',
    'ALTER TABLE condominios ADD COLUMN tem_portao_automatico INTEGER DEFAULT 1',
    'ALTER TABLE condominios ADD COLUMN quantidade_funcionarios INTEGER DEFAULT 0',
    'ALTER TABLE condominios ADD COLUMN quantidade_andares TEXT',
    'ALTER TABLE condominios ADD COLUMN quantidade_blocos INTEGER DEFAULT 1',
    'ALTER TABLE condominios ADD COLUMN idade_condominio TEXT'
  ];
  for (const sql of colunasCondominio) {
    try {
      db.exec(sql);
    } catch (e) {}
  }

  // Add detailed policy columns to seguros
  const colunasSeguros = [
    'ALTER TABLE seguros ADD COLUMN endereco_local_segurado TEXT',
    'ALTER TABLE seguros ADD COLUMN idade_condominio TEXT',
    'ALTER TABLE seguros ADD COLUMN quantidade_andares TEXT',
    'ALTER TABLE seguros ADD COLUMN quantidade_elevadores INTEGER',
    'ALTER TABLE seguros ADD COLUMN quantidade_blocos INTEGER',
    'ALTER TABLE seguros ADD COLUMN categoria_risco TEXT',
    'ALTER TABLE seguros ADD COLUMN tipo_seguro TEXT',
    'ALTER TABLE seguros ADD COLUMN produto_ramo TEXT',
    'ALTER TABLE seguros ADD COLUMN modalidade TEXT',
    'ALTER TABLE seguros ADD COLUMN condicoes_gerais TEXT',
    'ALTER TABLE seguros ADD COLUMN limite_maximo_garantia REAL',
    'ALTER TABLE seguros ADD COLUMN versao_tabela TEXT',
    'ALTER TABLE seguros ADD COLUMN valor_de_novo INTEGER DEFAULT 1',
    'ALTER TABLE seguros ADD COLUMN vigencia_inicio TEXT',
    'ALTER TABLE seguros ADD COLUMN vigencia_fim TEXT',
    'ALTER TABLE seguros ADD COLUMN cobertura_por_unidade REAL'
  ];
  for (const sql of colunasSeguros) {
    try {
      db.exec(sql);
    } catch (e) {}
  }

  // Add columns to seguro_coberturas
  const colunasCoberturas = [
    'ALTER TABLE seguro_coberturas ADD COLUMN preco_cobertura REAL',
    'ALTER TABLE seguro_coberturas ADD COLUMN franquia_percentual REAL',
    'ALTER TABLE seguro_coberturas ADD COLUMN franquia_reais REAL',
    'ALTER TABLE seguro_coberturas ADD COLUMN sem_franquia INTEGER DEFAULT 0'
  ];
  for (const sql of colunasCoberturas) {
    try {
      db.exec(sql);
    } catch (e) {}
  }

  // Add empresa_nome column to usuarios if it doesn't exist
  try {
    db.exec('ALTER TABLE usuarios ADD COLUMN empresa_nome TEXT');
  } catch (e) {
    // Ignore if column already exists
  }

  // Add servicos_permitidos (JSON string array) to usuarios if it doesn't exist
  try {
    db.exec('ALTER TABLE usuarios ADD COLUMN servicos_permitidos TEXT');
  } catch (e) {
    // Ignore if column already exists
  }

  // Tabela de Auditoria / Histórico de Mudanças
  db.exec(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER REFERENCES usuarios(id),
      usuario_nome TEXT,
      papel TEXT,
      acao TEXT NOT NULL,
      entidade TEXT NOT NULL,
      entidade_id INTEGER,
      campo TEXT,
      valor_anterior TEXT,
      valor_novo TEXT,
      detalhes TEXT,
      ip TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS spda_registros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      condominio_id INTEGER NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
      gerente_id INTEGER REFERENCES usuarios(id),
      data_atualizacao TEXT,
      data_validade TEXT,
      periodicidade_meses INTEGER DEFAULT 12,
      descricao TEXT,
      observacoes TEXT,
      empresa_executora TEXT,
      responsavel_tecnico TEXT,
      art_rrt TEXT,
      status TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
      atualizado_por INTEGER REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS spda_documentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spda_id INTEGER REFERENCES spda_registros(id) ON DELETE CASCADE,
      condominio_id INTEGER NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
      nome_arquivo TEXT NOT NULL,
      tipo_arquivo TEXT NOT NULL DEFAULT 'Laudo SPDA',
      tamanho INTEGER,
      ano INTEGER,
      caminho TEXT NOT NULL,
      url TEXT,
      uploaded_by INTEGER REFERENCES usuarios(id),
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS avcb_registros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      condominio_id INTEGER NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
      gerente_id INTEGER REFERENCES usuarios(id),
      numero_avcb TEXT,
      orgao_emissor TEXT,
      empresa_responsavel TEXT,
      responsavel_tecnico TEXT,
      data_emissao TEXT,
      data_atualizacao TEXT,
      data_validade TEXT,
      periodicidade_meses INTEGER DEFAULT 12,
      observacoes_tecnicas TEXT,
      status TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
      atualizado_por INTEGER REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS avcb_documentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avcb_id INTEGER REFERENCES avcb_registros(id) ON DELETE CASCADE,
      condominio_id INTEGER NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
      nome_arquivo TEXT NOT NULL,
      tipo_arquivo TEXT NOT NULL DEFAULT 'AVCB',
      tamanho INTEGER,
      ano INTEGER,
      caminho TEXT NOT NULL,
      url TEXT,
      uploaded_by INTEGER REFERENCES usuarios(id),
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_spda_registros_condominio ON spda_registros(condominio_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_avcb_registros_condominio ON avcb_registros(condominio_id);
  `);

  const colunasAuditoria = [
    'ALTER TABLE auditoria ADD COLUMN campo TEXT',
    'ALTER TABLE auditoria ADD COLUMN valor_anterior TEXT',
    'ALTER TABLE auditoria ADD COLUMN valor_novo TEXT'
  ];
  for (const sql of colunasAuditoria) {
    try {
      db.exec(sql);
    } catch (e) {}
  }
}

const SERVICOS_PADRAO = [
  { chave: 'dedetizacao', nome: 'Dedetização', tipo_controle: 'periodico', periodicidade_meses: 6, ordem: 1 },
  { chave: 'reservatorio', nome: 'Limpeza de reservatório', tipo_controle: 'periodico', periodicidade_meses: 6, ordem: 2 },
  { chave: 'extintor', nome: 'Extintor (recarga)', tipo_controle: 'periodico', periodicidade_meses: 12, ordem: 3 },
  { chave: 'avcb', nome: 'AVCB', tipo_controle: 'validade', periodicidade_meses: null, ordem: 4 },
  { chave: 'seguro', nome: 'Seguro', tipo_controle: 'validade', periodicidade_meses: null, ordem: 5 },
  { chave: 'spda', nome: 'SPDA', tipo_controle: 'validade', periodicidade_meses: 12, ordem: 6 },
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
