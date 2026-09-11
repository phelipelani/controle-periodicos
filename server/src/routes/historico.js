const express = require('express');
const db = require('../db');
const { filtroEscopo } = require('../acesso');

const router = express.Router();

// Histórico de realizações. Filtros opcionais: condominio, servico.
// Gerente só vê o histórico dos seus condomínios.
router.get('/', (req, res) => {
  const { condominio, servico } = req.query;
  const escopo = filtroEscopo(req.usuario, 'cs.condominio_id');
  const where = [escopo.sql];
  const params = [...escopo.params];
  if (condominio) { where.push('cs.condominio_id = ?'); params.push(Number(condominio)); }
  if (servico) { where.push('cs.servico_id = ?'); params.push(Number(servico)); }
  const sql = `
    SELECT h.*, cs.condominio_id, cs.servico_id,
           c.nome AS condominio_nome, s.nome AS servico_nome, s.chave AS servico_chave,
           usr.nome AS registrado_por_nome
    FROM historico h
    JOIN condominio_servicos cs ON cs.id = h.condominio_servico_id
    JOIN condominios c ON c.id = cs.condominio_id
    JOIN servicos s ON s.id = cs.servico_id
    LEFT JOIN usuarios usr ON usr.id = h.registrado_por
    WHERE ${where.join(' AND ')}
    ORDER BY h.data_realizacao DESC, h.id DESC
    LIMIT 200
  `;
  res.json(db.prepare(sql).all(...params));
});

// Histórico de alterações e auditoria do sistema
router.get('/auditoria', (req, res) => {
  const { entidade, entidade_id } = req.query;
  const where = [];
  const params = [];

  if (entidade) {
    where.push('entidade = ?');
    params.push(entidade);
  }
  if (entidade_id) {
    where.push('entidade_id = ?');
    params.push(Number(entidade_id));
  }

  // Se for empresa, só vê os logs das ações feitas por ela
  if (req.usuario?.papel === 'empresa') {
    where.push('usuario_id = ?');
    params.push(req.usuario.id);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `
    SELECT * FROM auditoria
    ${whereClause}
    ORDER BY id DESC
    LIMIT 100
  `;

  res.json(db.prepare(sql).all(...params));
});

module.exports = router;
