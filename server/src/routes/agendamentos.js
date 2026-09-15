const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { filtroEscopo, podeAcessarCondominio } = require('../acesso');
const { registrarServico } = require('../estado');

const router = express.Router();

// Configuração do multer para salvar recibos no OneDrive em:
// CONDOMÍNIOS/DEDETIZAÇÃO/[ano]/[codigoCondominio]/
const NUVEM_CONDOMINIOS_DIR =
  process.env.NUVEM_DIR ||
  'C:\\Users\\lesco\\OneDrive - IMCosta Administradora\\Arquivos de Leandro Costa - IMCosta - IMCosta Files\\CONDOMÍNIOS';

const getUploadDirDedetizacao = (ano, codigoCondominio) => {
  let baseDir = '';
  if (fs.existsSync(NUVEM_CONDOMINIOS_DIR)) {
    baseDir = path.join(NUVEM_CONDOMINIOS_DIR, 'DEDETIZAÇÃO');
  } else {
    const dataDir = process.env.DB_DIR || path.join(__dirname, '../../data');
    baseDir = path.join(dataDir, 'adm', 'dedetizacao');
  }

  const codFormatado = codigoCondominio ? String(codigoCondominio).padStart(3, '0') : 'geral';
  const anoFinal = String(ano || new Date().getFullYear());
  const dir = path.join(baseDir, anoFinal, codFormatado);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const ano = req.body.ano || new Date().getFullYear();
      const codigoCondominio = req.body.codigo_condominio || req.body.condominio_id || '000';
      const dir = getUploadDirDedetizacao(ano, codigoCondominio);
      cb(null, dir);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: function (req, file, cb) {
    const ano = req.body.ano || new Date().getFullYear();
    const uniqueSuffix = Date.now().toString().slice(-6);
    const ext = path.extname(file.originalname);
    cb(null, `recibo_dedetizacao_${ano}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage: storage, limits: { fileSize: 30 * 1024 * 1024 } });

// Lista agendamentos com filtros e dados do condomínio
router.get('/', (req, res) => {
  const { status, condominio } = req.query;
  const escopo = filtroEscopo(req.usuario, 'a.condominio_id');
  const where = [escopo.sql];
  const params = [...escopo.params];
  if (status) { where.push('a.status = ?'); params.push(status); }
  if (condominio) { where.push('a.condominio_id = ?'); params.push(Number(condominio)); }
  
  const sql = `
    SELECT 
      a.*, 
      c.nome AS condominio_nome, 
      printf('%03d', c.id) AS codigo_condominio,
      s.nome AS servico_nome, 
      s.chave AS servico_chave,
      COALESCE(a.anexo, h.anexo) AS recibo_anexo,
      h.id AS historico_id
    FROM agendamentos a
    JOIN condominios c ON c.id = a.condominio_id
    JOIN servicos s ON s.id = a.servico_id
    LEFT JOIN condominio_servicos cs ON cs.condominio_id = a.condominio_id AND cs.servico_id = a.servico_id
    LEFT JOIN historico h ON h.id = (
      SELECT MAX(id) FROM historico 
      WHERE condominio_servico_id = cs.id
    )
    WHERE ${where.join(' AND ')}
    ORDER BY (a.status = 'agendado') DESC, a.data_agendada ASC
  `;
  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  let { condominio_id, servico_id, data_agendada, periodo, empresa, observacao } = req.body || {};
  if (!condominio_id || !data_agendada) {
    return res.status(400).json({ erro: 'Condomínio e data agendada são obrigatórios' });
  }
  if (!podeAcessarCondominio(req.usuario, Number(condominio_id))) {
    return res.status(403).json({ erro: 'Você não tem acesso a este condomínio' });
  }
  if (!servico_id) {
    const ded = db.prepare("SELECT id FROM servicos WHERE chave = 'dedetizacao'").get();
    servico_id = ded?.id;
  }
  const empresaNorm = empresa ? String(empresa).trim().toUpperCase() : null;
  const info = db
    .prepare(`
      INSERT INTO agendamentos (condominio_id, servico_id, data_agendada, periodo, empresa, observacao, criado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(condominio_id, servico_id, data_agendada, periodo || null, empresaNorm, observacao || null, req.usuario.id);

  res.status(201).json(db.prepare('SELECT * FROM agendamentos WHERE id = ?').get(info.lastInsertRowid));
});

// Confirmar realização de agendamento (passou a data ou executado)
router.post('/:id/confirmar', upload.single('documento'), (req, res) => {
  const id = Number(req.params.id);
  const ag = db.prepare(`
    SELECT a.*, c.nome AS condominio_nome, printf('%03d', c.id) AS codigo_condominio
    FROM agendamentos a 
    JOIN condominios c ON c.id = a.condominio_id 
    WHERE a.id = ?
  `).get(id);

  if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });
  if (!podeAcessarCondominio(req.usuario, ag.condominio_id)) {
    return res.status(403).json({ erro: 'Você não tem acesso a este condomínio' });
  }

  const { data_realizacao, empresa, observacao } = req.body || {};
  const dataExecucao = data_realizacao || ag.data_agendada;
  const empresaExec = empresa !== undefined ? (empresa ? String(empresa).trim().toUpperCase() : null) : ag.empresa;
  const obs = observacao !== undefined ? observacao : ag.observacao;
  const anexoCaminho = req.file ? req.file.path : (ag.anexo || null);

  // 1. Atualizar o serviço do condomínio (condominio_servicos + novo histórico)
  const csAtualizado = registrarServico({
    condominioId: ag.condominio_id,
    servicoId: ag.servico_id,
    data: dataExecucao,
    registradoPor: req.usuario.id,
    origem: 'agendamento_confirmado',
    empresa: empresaExec,
    observacao: obs,
    anexo: anexoCaminho
  });

  // 2. Atualizar o agendamento para realizado
  db.prepare(`
    UPDATE agendamentos 
    SET status = 'realizado', 
        processado_em = datetime('now'),
        empresa = ?,
        observacao = ?,
        anexo = ?
    WHERE id = ?
  `).run(empresaExec, obs, anexoCaminho, id);

  res.json({
    ok: true,
    mensagem: 'Realização de serviço confirmada com sucesso!',
    agendamento: db.prepare('SELECT * FROM agendamentos WHERE id = ?').get(id),
    servico: csAtualizado
  });
});

// Anexar recibo / nota fiscal a um agendamento já realizado
router.post('/:id/recibo', upload.single('documento'), (req, res) => {
  const id = Number(req.params.id);
  const ag = db.prepare(`
    SELECT a.*, c.nome AS condominio_nome, printf('%03d', c.id) AS codigo_condominio
    FROM agendamentos a 
    JOIN condominios c ON c.id = a.condominio_id 
    WHERE a.id = ?
  `).get(id);

  if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });
  if (!podeAcessarCondominio(req.usuario, ag.condominio_id)) {
    return res.status(403).json({ erro: 'Você não tem acesso a este condomínio' });
  }
  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
  }

  const anexoCaminho = req.file.path;

  // Atualiza anexo no agendamento
  db.prepare('UPDATE agendamentos SET anexo = ? WHERE id = ?').run(anexoCaminho, id);

  // Atualiza anexo no último histórico deste condomínio/serviço
  const cs = db.prepare('SELECT id FROM condominio_servicos WHERE condominio_id = ? AND servico_id = ?').get(ag.condominio_id, ag.servico_id);
  if (cs) {
    db.prepare(`
      UPDATE historico 
      SET anexo = ? 
      WHERE id = (SELECT MAX(id) FROM historico WHERE condominio_servico_id = ?)
    `).run(anexoCaminho, cs.id);
  }

  res.json({
    ok: true,
    mensagem: 'Recibo anexado com sucesso!',
    caminho: anexoCaminho,
    agendamento: db.prepare('SELECT * FROM agendamentos WHERE id = ?').get(id)
  });
});

// Editar (data/empresa/observação) ou cancelar um agendamento ainda 'agendado'.
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const ag = db.prepare('SELECT * FROM agendamentos WHERE id = ?').get(id);
  if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });
  if (!podeAcessarCondominio(req.usuario, ag.condominio_id)) {
    return res.status(403).json({ erro: 'Você não tem acesso a este condomínio' });
  }
  if (ag.status !== 'agendado') {
    return res.status(400).json({ erro: 'Só é possível alterar agendamentos pendentes' });
  }
  const { data_agendada, periodo, empresa, observacao, status } = req.body || {};
  if (status === 'cancelado') {
    db.prepare("UPDATE agendamentos SET status = 'cancelado' WHERE id = ?").run(id);
  } else {
    const empresaNorm = empresa === undefined ? ag.empresa : (empresa ? String(empresa).trim().toUpperCase() : null);
    db.prepare('UPDATE agendamentos SET data_agendada = ?, periodo = ?, empresa = ?, observacao = ? WHERE id = ?').run(
      data_agendada ?? ag.data_agendada,
      periodo === undefined ? ag.periodo : (periodo || null),
      empresaNorm,
      observacao === undefined ? ag.observacao : observacao,
      id
    );
  }
  res.json(db.prepare('SELECT * FROM agendamentos WHERE id = ?').get(id));
});

// Cancelar / Excluir agendamento
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const ag = db.prepare('SELECT * FROM agendamentos WHERE id = ?').get(id);
  if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });
  if (!podeAcessarCondominio(req.usuario, ag.condominio_id)) {
    return res.status(403).json({ erro: 'Você não tem acesso a este condomínio' });
  }
  db.prepare('DELETE FROM agendamentos WHERE id = ?').run(id);
  res.json({ ok: true, mensagem: 'Agendamento cancelado com sucesso' });
});

module.exports = router;

