const express = require('express');
const db = require('../db');
const { statusVencimento } = require('../vencimentos');
const { registrarServico, periodicidadeEfetiva } = require('../estado');
const { exigirAdmin } = require('../auth');
const { filtroEscopo, podeAcessarCondominio, podeAcessarServico, registrarAuditoria } = require('../acesso');

const router = express.Router();

const PRIORIDADE_STATUS = { vencido: 0, a_vencer: 1, sem_registro: 2, em_dia: 3 };

// Monta a lista de serviços de um condomínio (todos do catálogo) com status calculado.
function servicosDoCondominio(condominioId) {
  const rows = db
    .prepare(`
      SELECT s.id AS servico_id, s.chave, s.nome, s.tipo_controle,
             s.periodicidade_meses, s.alerta_dias_antes, s.ordem,
             cs.id AS condominio_servico_id, cs.ultima_realizacao, cs.data_vencimento,
             cs.periodicidade_meses_override, cs.observacoes
      FROM servicos s
      LEFT JOIN condominio_servicos cs
        ON cs.servico_id = s.id AND cs.condominio_id = ?
      ORDER BY s.ordem, s.nome
    `)
    .all(condominioId);

  return rows.map((r) => {
    const { status, diasRestantes } = statusVencimento(r.data_vencimento, r.alerta_dias_antes);
    return {
      servico_id: r.servico_id,
      chave: r.chave,
      nome: r.nome,
      tipo_controle: r.tipo_controle,
      periodicidade_meses: periodicidadeEfetiva(
        { periodicidade_meses_override: r.periodicidade_meses_override },
        { periodicidade_meses: r.periodicidade_meses }
      ),
      alerta_dias_antes: r.alerta_dias_antes,
      ultima_realizacao: r.ultima_realizacao,
      data_vencimento: r.data_vencimento,
      observacoes: r.observacoes,
      status,
      diasRestantes,
    };
  });
}

function statusGeral(servicos) {
  let pior = 'em_dia';
  for (const s of servicos) {
    if (PRIORIDADE_STATUS[s.status] < PRIORIDADE_STATUS[pior]) pior = s.status;
  }
  return pior;
}

router.get('/', (req, res) => {
  const escopo = filtroEscopo(req.usuario, 'c.id');
  const condominios = db
    .prepare(`
      SELECT c.*, g.nome AS gerente_nome
      FROM condominios c
      LEFT JOIN usuarios g ON g.id = c.gerente_id
      WHERE ${escopo.sql}
      ORDER BY c.id ASC
    `)
    .all(...escopo.params);

  const resultado = condominios.map((c) => {
    const servicos = servicosDoCondominio(c.id);
    return {
      ...c,
      statusGeral: statusGeral(servicos),
      vencidos: servicos.filter((s) => s.status === 'vencido').length,
      aVencer: servicos.filter((s) => s.status === 'a_vencer').length,
      servicos
    };
  });
  res.json(resultado);
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!podeAcessarCondominio(req.usuario, id)) {
    return res.status(403).json({ erro: 'Você não tem acesso a este condomínio' });
  }
  const condominio = db
    .prepare(`
      SELECT c.*, g.nome AS gerente_nome
      FROM condominios c LEFT JOIN usuarios g ON g.id = c.gerente_id
      WHERE c.id = ?
    `)
    .get(id);
  if (!condominio) return res.status(404).json({ erro: 'Condomínio não encontrado' });
  res.json({ ...condominio, servicos: servicosDoCondominio(id) });
});

// Cadastro/edição/remoção de condomínio: apenas admin (define o gerente).
router.post('/', exigirAdmin, (req, res) => {
  const {
    nome,
    endereco,
    observacoes,
    gerente_id,
    imagem,
    cnpj,
    quantidade_apartamentos,
    tipo,
    tem_elevador,
    tem_portao_automatico,
    quantidade_funcionarios,
    email,
    telefone,
    endereco_correspondencia,
    bairro,
    cep,
    cidade,
    uf
  } = req.body || {};
  if (!nome) return res.status(400).json({ erro: 'Nome do condomínio é obrigatório' });

  const info = db
    .prepare(`
      INSERT INTO condominios (
        nome, endereco, observacoes, gerente_id, imagem,
        cnpj, quantidade_apartamentos, tipo, tem_elevador, tem_portao_automatico,
        quantidade_funcionarios, email, telefone, endereco_correspondencia,
        bairro, cep, cidade, uf
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      nome,
      endereco || null,
      observacoes || null,
      gerente_id || null,
      imagem || null,
      cnpj || null,
      quantidade_apartamentos != null ? Number(quantidade_apartamentos) : 0,
      tipo || 'Vertical',
      tem_elevador !== undefined ? (tem_elevador ? 1 : 0) : 1,
      tem_portao_automatico !== undefined ? (tem_portao_automatico ? 1 : 0) : 1,
      quantidade_funcionarios != null ? Number(quantidade_funcionarios) : 0,
      email || null,
      telefone || null,
      endereco_correspondencia || null,
      bairro || null,
      cep || null,
      cidade || 'Caraguatatuba',
      uf || 'SP'
    );
  res.status(201).json(db.prepare('SELECT * FROM condominios WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', exigirAdmin, (req, res) => {
  const id = Number(req.params.id);
  const condominio = db.prepare('SELECT * FROM condominios WHERE id = ?').get(id);
  if (!condominio) return res.status(404).json({ erro: 'Condomínio não encontrado' });
  const {
    nome,
    endereco,
    observacoes,
    gerente_id,
    imagem,
    cnpj,
    quantidade_apartamentos,
    tipo,
    tem_elevador,
    tem_portao_automatico,
    quantidade_funcionarios,
    email,
    telefone,
    endereco_correspondencia,
    bairro,
    cep,
    cidade,
    uf
  } = req.body || {};

  db.prepare(`
    UPDATE condominios
    SET nome = ?,
        endereco = ?,
        observacoes = ?,
        gerente_id = ?,
        imagem = ?,
        cnpj = ?,
        quantidade_apartamentos = ?,
        tipo = ?,
        tem_elevador = ?,
        tem_portao_automatico = ?,
        quantidade_funcionarios = ?,
        email = ?,
        telefone = ?,
        endereco_correspondencia = ?,
        bairro = ?,
        cep = ?,
        cidade = ?,
        uf = ?
    WHERE id = ?
  `).run(
    nome ?? condominio.nome,
    endereco === undefined ? condominio.endereco : (endereco || null),
    observacoes === undefined ? condominio.observacoes : (observacoes || null),
    gerente_id === undefined ? condominio.gerente_id : (gerente_id || null),
    imagem === undefined ? condominio.imagem : (imagem || null),
    cnpj === undefined ? condominio.cnpj : (cnpj || null),
    quantidade_apartamentos === undefined ? condominio.quantidade_apartamentos : (quantidade_apartamentos != null ? Number(quantidade_apartamentos) : 0),
    tipo === undefined ? condominio.tipo : (tipo || 'Vertical'),
    tem_elevador === undefined ? condominio.tem_elevador : (tem_elevador ? 1 : 0),
    tem_portao_automatico === undefined ? condominio.tem_portao_automatico : (tem_portao_automatico ? 1 : 0),
    quantidade_funcionarios === undefined ? condominio.quantidade_funcionarios : (Number(quantidade_funcionarios) || 0),
    email === undefined ? condominio.email : (email || null),
    telefone === undefined ? condominio.telefone : (telefone || null),
    endereco_correspondencia === undefined ? condominio.endereco_correspondencia : (endereco_correspondencia || null),
    bairro === undefined ? condominio.bairro : (bairro || null),
    cep === undefined ? condominio.cep : (cep || null),
    cidade === undefined ? condominio.cidade : (cidade || 'Caraguatatuba'),
    uf === undefined ? condominio.uf : (uf || 'SP'),
    id
  );
  res.json(db.prepare('SELECT * FROM condominios WHERE id = ?').get(id));
});

router.delete('/:id', exigirAdmin, (req, res) => {
  const id = Number(req.params.id);
  try {
    const csIds = db.prepare('SELECT id FROM condominio_servicos WHERE condominio_id = ?').all(id).map(r => r.id);
    if (csIds.length > 0) {
      const placeholders = csIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM historico WHERE condominio_servico_id IN (${placeholders})`).run(...csIds);
    }
    db.prepare('DELETE FROM condominio_servicos WHERE condominio_id = ?').run(id);
    db.prepare('DELETE FROM agendamentos WHERE condominio_id = ?').run(id);
    db.prepare('DELETE FROM condominios WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: 'Falha ao excluir condomínio: ' + e.message });
  }
});

// Registrar realização (periódico) ou data de validade (AVCB/seguro) de um serviço.
router.put('/:id/servicos/:servicoId', (req, res) => {
  const condominioId = Number(req.params.id);
  const servicoId = Number(req.params.servicoId);
  const { data, empresa, observacao, anexo } = req.body || {};
  if (!data) return res.status(400).json({ erro: 'Data é obrigatória' });
  if (!podeAcessarCondominio(req.usuario, condominioId)) {
    return res.status(403).json({ erro: 'Você não tem acesso a este condomínio' });
  }

  const servico = db.prepare('SELECT chave FROM servicos WHERE id = ?').get(servicoId);
  if (servico && !podeAcessarServico(req.usuario, servico.chave)) {
    return res.status(403).json({ erro: 'Você não tem permissão para alterar este serviço.' });
  }

  try {
    registrarServico({
      condominioId,
      servicoId,
      data,
      registradoPor: req.usuario.id,
      origem: 'manual',
      empresa: empresa || null,
      observacao: observacao || null,
      anexo: anexo || null,
    });

    registrarAuditoria(req, 'REGISTRAR_SERVICO', 'condominio_servicos', servicoId, {
      condominio_id: condominioId,
      servico_id: servicoId,
      servico_chave: servico?.chave,
      data,
      empresa,
      tem_anexo: !!anexo
    });
  } catch (e) {
    return res.status(400).json({ erro: e.message });
  }
  res.json({ ...condominio, servicos: servicosDoCondominio(condominioId) });
});

// Rota específica para upload/anexo de recibo por empresa ou gerente
router.put('/:id/servicos/:servicoId/recibo', (req, res) => {
  const condominioId = Number(req.params.id);
  const servicoId = Number(req.params.servicoId);
  const { anexo } = req.body || {};

  if (!podeAcessarCondominio(req.usuario, condominioId)) {
    return res.status(403).json({ erro: 'Você não tem acesso a este condomínio' });
  }

  const servico = db.prepare('SELECT chave FROM servicos WHERE id = ?').get(servicoId);
  if (servico && !podeAcessarServico(req.usuario, servico.chave)) {
    return res.status(403).json({ erro: 'Você não tem permissão para alterar este serviço.' });
  }

  // Atualizar anexo no último histórico
  const cs = db.prepare('SELECT id FROM condominio_servicos WHERE condominio_id = ? AND servico_id = ?').get(condominioId, servicoId);
  if (cs) {
    const ultHist = db.prepare('SELECT id FROM historico WHERE condominio_servico_id = ? ORDER BY id DESC LIMIT 1').get(cs.id);
    if (ultHist) {
      db.prepare('UPDATE historico SET anexo = ? WHERE id = ?').run(anexo || null, ultHist.id);
    }
  }

  registrarAuditoria(req, 'ANEXAR_RECIBO', 'condominio_servicos', servicoId, {
    condominio_id: condominioId,
    servico_id: servicoId,
    anexo
  });

  res.json({ ok: true, anexo });
});

module.exports = { router, servicosDoCondominio, statusGeral };
