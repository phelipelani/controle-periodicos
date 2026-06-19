const express = require('express');
const db = require('../db');
const { promoteAgendamentos } = require('../jobs');
const { filtroEscopo, podeAcessarCondominio } = require('../acesso');

const router = express.Router();

// Lista agendamentos (promove preguiçosamente os que já venceram antes de listar).
// Filtros opcionais: status, condominio. Gerente só vê os agendamentos dos seus condomínios.
router.get('/', (req, res) => {
  promoteAgendamentos();
  const { status, condominio } = req.query;
  const escopo = filtroEscopo(req.usuario, 'a.condominio_id');
  const where = [escopo.sql];
  const params = [...escopo.params];
  if (status) { where.push('a.status = ?'); params.push(status); }
  if (condominio) { where.push('a.condominio_id = ?'); params.push(Number(condominio)); }
  const sql = `
    SELECT a.*, c.nome AS condominio_nome, s.nome AS servico_nome, s.chave AS servico_chave
    FROM agendamentos a
    JOIN condominios c ON c.id = a.condominio_id
    JOIN servicos s ON s.id = a.servico_id
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
  // Por padrão, agendamento é de dedetização.
  if (!servico_id) {
    const ded = db.prepare("SELECT id FROM servicos WHERE chave = 'dedetizacao'").get();
    servico_id = ded?.id;
  }
  const info = db
    .prepare(`
      INSERT INTO agendamentos (condominio_id, servico_id, data_agendada, periodo, empresa, observacao, criado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(condominio_id, servico_id, data_agendada, periodo || null, empresa || null, observacao || null, req.usuario.id);

  // Se a data já chegou, promove na hora.
  promoteAgendamentos();
  res.status(201).json(db.prepare('SELECT * FROM agendamentos WHERE id = ?').get(info.lastInsertRowid));
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
    db.prepare('UPDATE agendamentos SET data_agendada = ?, periodo = ?, empresa = ?, observacao = ? WHERE id = ?').run(
      data_agendada ?? ag.data_agendada,
      periodo === undefined ? ag.periodo : (periodo || null),
      empresa === undefined ? ag.empresa : empresa,
      observacao === undefined ? ag.observacao : observacao,
      id
    );
    promoteAgendamentos();
  }
  res.json(db.prepare('SELECT * FROM agendamentos WHERE id = ?').get(id));
});

module.exports = router;
