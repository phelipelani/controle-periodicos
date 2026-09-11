const express = require('express');
const db = require('../db');
const { exigirAdmin } = require('../auth');
const { filtroEscopo, podeAcessarCondominio, podeAcessarServico, registrarAuditoria } = require('../acesso');

const router = express.Router();

function calcularStatusExtintor(dataVencimento) {
  if (!dataVencimento) return { status: 'sem_registro', diasRestantes: null };
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [y, m, d] = dataVencimento.split('-').map(Number);
  const dataAlvo = new Date(y, m - 1, d);
  dataAlvo.setHours(0, 0, 0, 0);

  const diffMs = dataAlvo.getTime() - hoje.getTime();
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) return { status: 'vencido', diasRestantes };
  if (diasRestantes <= 90) return { status: 'a_vencer', diasRestantes };
  return { status: 'em_dia', diasRestantes };
}

// Listar todos os condomínios com seus dados de extintores
router.get('/', (req, res) => {
  if (!podeAcessarServico(req.usuario, 'extintor')) {
    return res.status(403).json({ erro: 'Acesso negado ao serviço de extintores.' });
  }

  const escopo = filtroEscopo(req.usuario, 'c.id', 'extintor');
  
  const condominios = db
    .prepare(`
      SELECT 
        c.id AS condominio_id,
        c.nome AS condominio_nome,
        c.endereco AS condominio_endereco,
        c.gerente_id,
        g.nome AS gerente_nome,
        ed.id AS extintor_detalhe_id,
        ed.data_ultima_recarga,
        ed.data_proximo_vencimento,
        ed.data_ultimo_teste_hidrostatico,
        ed.observacoes,
        ed.anexo,
        ed.atualizado_em
      FROM condominios c
      LEFT JOIN usuarios g ON g.id = c.gerente_id
      LEFT JOIN extintores_detalhes ed ON ed.condominio_id = c.id
      WHERE ${escopo.sql}
      ORDER BY c.id ASC
    `)
    .all(...escopo.params);

  const todosItens = db
    .prepare(`
      SELECT ei.extintor_detalhe_id, ei.tipo, ei.quantidade
      FROM extintores_itens ei
      JOIN extintores_detalhes ed ON ed.id = ei.extintor_detalhe_id
    `)
    .all();

  const itensPorDetalhe = {};
  for (const item of todosItens) {
    if (!itensPorDetalhe[item.extintor_detalhe_id]) {
      itensPorDetalhe[item.extintor_detalhe_id] = [];
    }
    itensPorDetalhe[item.extintor_detalhe_id].push({
      tipo: item.tipo,
      quantidade: item.quantidade
    });
  }

  const resultado = condominios.map((c) => {
    const tipos = itensPorDetalhe[c.extintor_detalhe_id] || [];
    const totalExtintores = tipos.reduce((acc, curr) => acc + (Number(curr.quantidade) || 0), 0);
    const { status, diasRestantes } = calcularStatusExtintor(c.data_proximo_vencimento);

    return {
      id: c.condominio_id,
      codigo: String(c.condominio_id).padStart(3, '0'),
      condominio: c.condominio_nome,
      endereco: c.condominio_endereco,
      gerente_id: c.gerente_id,
      gerente: c.gerente_nome || 'Sem gerente',
      dataUltimaRecarga: c.data_ultima_recarga || null,
      dataProximoVencimento: c.data_proximo_vencimento || null,
      dataUltimoTesteHidrostatico: c.data_ultimo_teste_hidrostatico || null,
      observacoes: c.observacoes || '',
      anexo: c.anexo || null,
      atualizadoEm: c.atualizado_em || null,
      totalExtintores,
      tipos,
      status,
      diasRestantes
    };
  });

  res.json(resultado);
});

// Salvar ou atualizar extintores de um condomínio
router.post('/', (req, res) => {
  const {
    condominio_id,
    data_ultima_recarga,
    data_proximo_vencimento,
    data_ultimo_teste_hidrostatico,
    observacoes,
    anexo,
    tipos = []
  } = req.body || {};

  if (!condominio_id) {
    return res.status(400).json({ erro: 'Condomínio é obrigatório.' });
  }

  if (!podeAcessarCondominio(req.usuario, Number(condominio_id))) {
    return res.status(403).json({ erro: 'Acesso negado a este condomínio.' });
  }

  const salvarTransacao = db.transaction(() => {
    // 1. Inserir ou atualizar extintores_detalhes
    const existente = db
      .prepare('SELECT id FROM extintores_detalhes WHERE condominio_id = ?')
      .get(Number(condominio_id));

    let detalheId;
    if (existente) {
      detalheId = existente.id;
      db.prepare(`
        UPDATE extintores_detalhes
        SET data_ultima_recarga = ?,
            data_proximo_vencimento = ?,
            data_ultimo_teste_hidrostatico = ?,
            observacoes = ?,
            anexo = ?,
            atualizado_em = datetime('now')
        WHERE id = ?
      `).run(
        data_ultima_recarga || null,
        data_proximo_vencimento || null,
        data_ultimo_teste_hidrostatico || null,
        observacoes || null,
        anexo || null,
        detalheId
      );
    } else {
      const info = db.prepare(`
        INSERT INTO extintores_detalhes (
          condominio_id, data_ultima_recarga, data_proximo_vencimento,
          data_ultimo_teste_hidrostatico, observacoes, anexo, criado_em, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        Number(condominio_id),
        data_ultima_recarga || null,
        data_proximo_vencimento || null,
        data_ultimo_teste_hidrostatico || null,
        observacoes || null,
        anexo || null
      );
      detalheId = info.lastInsertRowid;
    }

    // 2. Atualizar itens
    db.prepare('DELETE FROM extintores_itens WHERE extintor_detalhe_id = ?').run(detalheId);
    const insertItem = db.prepare(`
      INSERT INTO extintores_itens (extintor_detalhe_id, tipo, quantidade)
      VALUES (?, ?, ?)
    `);

    for (const t of tipos) {
      if (t.tipo && t.quantidade !== undefined && t.quantidade !== '') {
        insertItem.run(detalheId, t.tipo.trim(), Number(t.quantidade) || 0);
      }
    }

    // 3. Sincronizar com condominio_servicos para o serviço 'extintor'
    const servicoExtintor = db.prepare("SELECT id FROM servicos WHERE chave = 'extintor'").get();
    if (servicoExtintor) {
      const csExistente = db.prepare(`
        SELECT id FROM condominio_servicos
        WHERE condominio_id = ? AND servico_id = ?
      `).get(Number(condominio_id), servicoExtintor.id);

      if (csExistente) {
        db.prepare(`
          UPDATE condominio_servicos
          SET ultima_realizacao = ?,
              data_vencimento = ?,
              observacoes = ?
          WHERE id = ?
        `).run(
          data_ultima_recarga || null,
          data_proximo_vencimento || null,
          observacoes || null,
          csExistente.id
        );

        if (data_ultima_recarga) {
          db.prepare(`
            INSERT INTO historico (
              condominio_servico_id, data_realizacao, data_vencimento,
              registrado_por, origem, observacao, anexo
            ) VALUES (?, ?, ?, ?, 'manual', ?, ?)
          `).run(
            csExistente.id,
            data_ultima_recarga,
            data_proximo_vencimento || null,
            req.usuario.id,
            observacoes || null,
            anexo || null
          );
        }
      } else {
        const infoCs = db.prepare(`
          INSERT INTO condominio_servicos (
            condominio_id, servico_id, ultima_realizacao, data_vencimento, observacoes
          ) VALUES (?, ?, ?, ?, ?)
        `).run(
          Number(condominio_id),
          servicoExtintor.id,
          data_ultima_recarga || null,
          data_proximo_vencimento || null,
          observacoes || null
        );

        if (data_ultima_recarga) {
          db.prepare(`
            INSERT INTO historico (
              condominio_servico_id, data_realizacao, data_vencimento,
              registrado_por, origem, observacao, anexo
            ) VALUES (?, ?, ?, ?, 'manual', ?, ?)
          `).run(
            infoCs.lastInsertRowid,
            data_ultima_recarga,
            data_proximo_vencimento || null,
            req.usuario.id,
            observacoes || null,
            anexo || null
          );
        }
      }
    }

    return detalheId;
  });

  try {
    const id = salvarTransacao();
    registrarAuditoria(req, 'SALVAR_EXTINTORES', 'extintores_detalhes', id, {
      condominio_id,
      data_ultima_recarga,
      data_proximo_vencimento,
      data_ultimo_teste_hidrostatico,
      tem_anexo: !!anexo,
      quantidade_tipos: tipos.length
    });
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar registro de extintores: ' + err.message });
  }
});

// Deletar registro de extintor de um condomínio
router.delete('/:condominioId', exigirAdmin, (req, res) => {
  const condominioId = Number(req.params.condominioId);
  try {
    db.prepare('DELETE FROM extintores_detalhes WHERE condominio_id = ?').run(condominioId);
    
    // Limpar datas do serviço extintor em condominio_servicos
    const servicoExtintor = db.prepare("SELECT id FROM servicos WHERE chave = 'extintor'").get();
    if (servicoExtintor) {
      db.prepare(`
        UPDATE condominio_servicos
        SET ultima_realizacao = NULL, data_vencimento = NULL, observacoes = NULL
        WHERE condominio_id = ? AND servico_id = ?
      `).run(condominioId, servicoExtintor.id);
    }

    registrarAuditoria(req, 'EXCLUIR_EXTINTORES', 'condominios', condominioId, { condominio_id: condominioId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir extintores: ' + err.message });
  }
});

module.exports = router;
