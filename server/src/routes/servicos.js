const express = require('express');
const db = require('../db');
const { exigirAdmin } = require('../auth');
const { statusVencimento } = require('../vencimentos');
const { filtroEscopo, podeAcessarServico } = require('../acesso');

const router = express.Router();

// Catálogo de serviços (qualquer usuário autenticado pode ler, respeitando permissões de empresa).
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM servicos ORDER BY ordem, nome').all();
  const permitidos = rows.filter((s) => podeAcessarServico(req.usuario, s.chave));
  res.json(permitidos);
});

// Situação de um serviço em todos os condomínios (do escopo do usuário).
// Usado nas páginas por serviço (Extintores, Reservatórios, Seguros, AVCB...).
router.get('/:chave/condominios', (req, res) => {
  const { chave } = req.params;
  if (!podeAcessarServico(req.usuario, chave)) {
    return res.status(403).json({ erro: 'Acesso negado a este serviço.' });
  }

  const servico = db.prepare('SELECT * FROM servicos WHERE chave = ?').get(chave);
  if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado' });

  const escopo = filtroEscopo(req.usuario, 'c.id', chave);
  const rows = db
    .prepare(`
      SELECT c.id AS condominio_id, c.nome AS condominio_nome, g.nome AS gerente_nome,
             cs.ultima_realizacao, cs.data_vencimento
      FROM condominios c
      LEFT JOIN usuarios g ON g.id = c.gerente_id
      LEFT JOIN condominio_servicos cs ON cs.condominio_id = c.id AND cs.servico_id = ?
      WHERE ${escopo.sql}
      ORDER BY c.id ASC
    `)
    .all(servico.id, ...escopo.params);

  const itens = rows.map((r) => {
    const { status, diasRestantes } = statusVencimento(r.data_vencimento, servico.alerta_dias_antes);
    return { ...r, status, diasRestantes };
  });

  res.json({ servico, itens });
});

// Relatório detalhado de um serviço (usado na tela de Dedetização)
router.get('/:chave/detalhado', (req, res) => {
  const { chave } = req.params;
  if (!podeAcessarServico(req.usuario, chave)) {
    return res.status(403).json({ erro: 'Acesso negado a este serviço.' });
  }

  const servico = db.prepare('SELECT * FROM servicos WHERE chave = ?').get(chave);
  if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado' });

  const escopo = filtroEscopo(req.usuario, 'c.id', chave);
  
  // Buscar condomínios + agendamento pendente + última execução
  const rows = db
    .prepare(`
      SELECT 
        c.id AS condominio_id, c.nome AS condominio_nome,
        cs.ultima_realizacao, cs.data_vencimento,
        ag.data_agendada, ag.periodo AS agendamento_periodo, ag.empresa AS agendamento_empresa, ag.id AS agendamento_id, ag.observacao AS agendamento_observacao,
        h.empresa AS historico_empresa, h.anexo AS historico_anexo, h.observacao AS historico_observacao, h.id AS historico_id
      FROM condominios c
      LEFT JOIN condominio_servicos cs ON cs.condominio_id = c.id AND cs.servico_id = ?
      LEFT JOIN agendamentos ag ON ag.id = (
        SELECT MAX(id) FROM agendamentos 
        WHERE condominio_id = c.id AND servico_id = ? AND status = 'agendado'
      )
      LEFT JOIN historico h ON h.id = (
        SELECT MAX(id) FROM historico 
        WHERE condominio_servico_id = cs.id
      )
      WHERE ${escopo.sql}
      ORDER BY c.id ASC
    `)
    .all(servico.id, servico.id, ...escopo.params);

  const itens = rows.map((r) => {
    const { status: baseStatus } = statusVencimento(r.data_vencimento, servico.alerta_dias_antes);
    
    // Calcular status final de dedetização
    let statusCalc = baseStatus;
    if (r.data_agendada) {
      statusCalc = 'agendado';
    } else if (baseStatus === 'em_dia' && !r.historico_anexo) {
      statusCalc = 'sem_nota';
    } else if (baseStatus === 'a_vencer' || baseStatus === 'sem_registro') {
      statusCalc = 'pendente';
    }

    return {
      id: r.condominio_id,
      condominio_id: r.condominio_id,
      condominio_nome: r.condominio_nome,
      empresa_executora: r.historico_empresa || r.agendamento_empresa || '-',
      historico_empresa: r.historico_empresa || null,
      data_agendada: r.data_agendada || null,
      periodo: r.agendamento_periodo || '',
      data_execucao: r.ultima_realizacao || null,
      proxima_execucao: r.data_vencimento || null,
      status: statusCalc,
      nota: r.historico_anexo ? { status: 'Anexada', path: r.historico_anexo } : { status: 'Pendente', path: null },
      historico_anexo: r.historico_anexo || null,
      observacoes: r.historico_observacao || null,
      agendamento_id: r.agendamento_id,
      agendamento_empresa: r.agendamento_empresa || null,
      agendamento_periodo: r.agendamento_periodo || 'Manhã',
      agendamento_observacao: r.agendamento_observacao || '',
      historico_id: r.historico_id
    };
  });

  res.json({ servico, itens });
});

// Editar configuração de um serviço (periodicidade / dias de alerta) — só admin.
router.put('/:id', exigirAdmin, (req, res) => {
  const id = Number(req.params.id);
  const servico = db.prepare('SELECT * FROM servicos WHERE id = ?').get(id);
  if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado' });

  const { nome, periodicidade_meses, alerta_dias_antes } = req.body || {};
  db.prepare(
    'UPDATE servicos SET nome = ?, periodicidade_meses = ?, alerta_dias_antes = ? WHERE id = ?'
  ).run(
    nome ?? servico.nome,
    periodicidade_meses === undefined ? servico.periodicidade_meses : (periodicidade_meses || null),
    alerta_dias_antes === undefined ? servico.alerta_dias_antes : Number(alerta_dias_antes),
    id
  );
  res.json(db.prepare('SELECT * FROM servicos WHERE id = ?').get(id));
});

module.exports = router;
