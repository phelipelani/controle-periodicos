const express = require('express');
const db = require('../db');
const { exigirAdmin } = require('../auth');
const { filtroEscopo, podeAcessarCondominio, podeAcessarServico, registrarAuditoria } = require('../acesso');

const router = express.Router();

function calcularStatusReservatorio(dataVencimento) {
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

// Listar todos os condomínios com seus dados de reservatórios
router.get('/', (req, res) => {
  if (!podeAcessarServico(req.usuario, 'reservatorio')) {
    return res.status(403).json({ erro: 'Acesso negado ao serviço de reservatórios.' });
  }

  const escopo = filtroEscopo(req.usuario, 'c.id', 'reservatorio');
  
  const servicoReservatorio = db.prepare("SELECT id FROM servicos WHERE chave = 'reservatorio'").get();
  const servicoId = servicoReservatorio ? servicoReservatorio.id : null;

  const condominios = db
    .prepare(`
      SELECT 
        c.id AS condominio_id,
        c.nome AS condominio_nome,
        c.endereco AS condominio_endereco,
        c.gerente_id,
        g.nome AS gerente_nome,
        rd.id AS reservatorio_detalhe_id,
        COALESCE(rd.data_ultima_limpeza, cs.ultima_realizacao) AS data_ultima_limpeza,
        COALESCE(rd.data_proximo_vencimento, cs.data_vencimento) AS data_proximo_vencimento,
        rd.capacidade_litros,
        COALESCE(rd.observacoes, cs.observacoes) AS observacoes,
        rd.anexo,
        rd.atualizado_em
      FROM condominios c
      LEFT JOIN usuarios g ON g.id = c.gerente_id
      LEFT JOIN reservatorios_detalhes rd ON rd.condominio_id = c.id
      LEFT JOIN condominio_servicos cs ON cs.condominio_id = c.id AND cs.servico_id = ?
      WHERE ${escopo.sql}
      ORDER BY c.id ASC
    `)
    .all(servicoId, ...escopo.params);

  const resultado = condominios.map((c) => {
    const { status, diasRestantes } = calcularStatusReservatorio(c.data_proximo_vencimento);

    return {
      id: c.condominio_id,
      codigo: String(c.condominio_id).padStart(3, '0'),
      condominio: c.condominio_nome,
      endereco: c.condominio_endereco,
      gerente_id: c.gerente_id,
      gerente: c.gerente_nome || 'Sem gerente',
      dataUltimaLimpeza: c.data_ultima_limpeza || null,
      dataProximoVencimento: c.data_proximo_vencimento || null,
      capacidadeLitros: c.capacidade_litros != null ? Number(c.capacidade_litros) : null,
      observacoes: c.observacoes || '',
      anexo: c.anexo || null,
      atualizadoEm: c.atualizado_em || null,
      status,
      diasRestantes
    };
  });

  res.json(resultado);
});

// Salvar ou atualizar reservatório de um condomínio
router.post('/', (req, res) => {
  const {
    condominio_id,
    data_ultima_limpeza,
    data_proximo_vencimento,
    capacidade_litros,
    observacoes,
    anexo
  } = req.body || {};

  if (!condominio_id) {
    return res.status(400).json({ erro: 'Condomínio é obrigatório.' });
  }

  if (!podeAcessarCondominio(req.usuario, Number(condominio_id))) {
    return res.status(403).json({ erro: 'Acesso negado a este condomínio.' });
  }

  const salvarTransacao = db.transaction(() => {
    // 1. Inserir ou atualizar reservatorios_detalhes
    const existente = db
      .prepare('SELECT id FROM reservatorios_detalhes WHERE condominio_id = ?')
      .get(Number(condominio_id));

    let detalheId;
    const capacidadeNum = capacidade_litros !== '' && capacidade_litros !== null && capacidade_litros !== undefined
      ? parseInt(String(capacidade_litros).replace(/\D/g, ''), 10) || null
      : null;

    if (existente) {
      detalheId = existente.id;
      db.prepare(`
        UPDATE reservatorios_detalhes
        SET data_ultima_limpeza = ?,
            data_proximo_vencimento = ?,
            capacidade_litros = ?,
            observacoes = ?,
            anexo = ?,
            atualizado_em = datetime('now')
        WHERE id = ?
      `).run(
        data_ultima_limpeza || null,
        data_proximo_vencimento || null,
        capacidadeNum,
        observacoes || null,
        anexo || null,
        detalheId
      );
    } else {
      const info = db.prepare(`
        INSERT INTO reservatorios_detalhes (
          condominio_id, data_ultima_limpeza, data_proximo_vencimento,
          capacidade_litros, observacoes, anexo, criado_em, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        Number(condominio_id),
        data_ultima_limpeza || null,
        data_proximo_vencimento || null,
        capacidadeNum,
        observacoes || null,
        anexo || null
      );
      detalheId = info.lastInsertRowid;
    }

    // 2. Sincronizar com condominio_servicos para o serviço 'reservatorio'
    const servicoReservatorio = db.prepare("SELECT id FROM servicos WHERE chave = 'reservatorio'").get();
    if (servicoReservatorio) {
      const csExistente = db.prepare(`
        SELECT id FROM condominio_servicos
        WHERE condominio_id = ? AND servico_id = ?
      `).get(Number(condominio_id), servicoReservatorio.id);

      if (csExistente) {
        db.prepare(`
          UPDATE condominio_servicos
          SET ultima_realizacao = ?,
              data_vencimento = ?,
              observacoes = ?
          WHERE id = ?
        `).run(
          data_ultima_limpeza || null,
          data_proximo_vencimento || null,
          observacoes || null,
          csExistente.id
        );

        if (data_ultima_limpeza) {
          db.prepare(`
            INSERT INTO historico (
              condominio_servico_id, data_realizacao, data_vencimento,
              registrado_por, origem, observacao, anexo
            ) VALUES (?, ?, ?, ?, 'manual', ?, ?)
          `).run(
            csExistente.id,
            data_ultima_limpeza,
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
          servicoReservatorio.id,
          data_ultima_limpeza || null,
          data_proximo_vencimento || null,
          observacoes || null
        );

        if (data_ultima_limpeza) {
          db.prepare(`
            INSERT INTO historico (
              condominio_servico_id, data_realizacao, data_vencimento,
              registrado_por, origem, observacao, anexo
            ) VALUES (?, ?, ?, ?, 'manual', ?, ?)
          `).run(
            infoCs.lastInsertRowid,
            data_ultima_limpeza,
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
    registrarAuditoria(req, 'SALVAR_RESERVATORIO', 'reservatorios_detalhes', id, {
      condominio_id,
      data_ultima_limpeza,
      data_proximo_vencimento,
      capacidade_litros,
      tem_anexo: !!anexo
    });
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar registro de reservatório: ' + err.message });
  }
});

// Deletar registro de reservatório de um condomínio
router.delete('/:condominioId', exigirAdmin, (req, res) => {
  const condominioId = Number(req.params.condominioId);
  try {
    db.prepare('DELETE FROM reservatorios_detalhes WHERE condominio_id = ?').run(condominioId);
    
    // Limpar datas do serviço reservatorio em condominio_servicos
    const servicoReservatorio = db.prepare("SELECT id FROM servicos WHERE chave = 'reservatorio'").get();
    if (servicoReservatorio) {
      db.prepare(`
        UPDATE condominio_servicos
        SET ultima_realizacao = NULL, data_vencimento = NULL, observacoes = NULL
        WHERE condominio_id = ? AND servico_id = ?
      `).run(condominioId, servicoReservatorio.id);
    }

    registrarAuditoria(req, 'EXCLUIR_RESERVATORIO', 'condominios', condominioId, { condominio_id: condominioId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir reservatório: ' + err.message });
  }
});

module.exports = router;
