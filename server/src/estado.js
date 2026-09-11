// Funções compartilhadas para atualizar o estado de um serviço de um condomínio.
const db = require('./db');
const { calcularVencimentoPeriodico } = require('./vencimentos');

function getServico(servicoId) {
  return db.prepare('SELECT * FROM servicos WHERE id = ?').get(servicoId);
}

// Garante que exista a linha condominio_servicos para (condominio, servico) e a retorna.
function getOrCreateCondominioServico(condominioId, servicoId) {
  let row = db
    .prepare('SELECT * FROM condominio_servicos WHERE condominio_id = ? AND servico_id = ?')
    .get(condominioId, servicoId);
  if (!row) {
    const info = db
      .prepare('INSERT INTO condominio_servicos (condominio_id, servico_id) VALUES (?, ?)')
      .run(condominioId, servicoId);
    row = db.prepare('SELECT * FROM condominio_servicos WHERE id = ?').get(info.lastInsertRowid);
  }
  return row;
}

function periodicidadeEfetiva(cs, servico) {
  return cs.periodicidade_meses_override || servico.periodicidade_meses;
}

// Registra a realização de um serviço PERIÓDICO (recalcula o vencimento) ou
// a data de validade de um serviço do tipo VALIDADE.
// Para periódico: `data` é a data de realização.
// Para validade: `data` é a própria data de vencimento/validade.
function registrarServico({ condominioId, servicoId, data, registradoPor, origem = 'manual', empresa = null, observacao = null, anexo = null }) {
  const servico = getServico(servicoId);
  if (!servico) throw new Error('Serviço inexistente');
  const cs = getOrCreateCondominioServico(condominioId, servicoId);

  let ultimaRealizacao = cs.ultima_realizacao;
  let dataVencimento;

  if (servico.tipo_controle === 'validade') {
    dataVencimento = data;
  } else {
    ultimaRealizacao = data;
    dataVencimento = calcularVencimentoPeriodico(data, periodicidadeEfetiva(cs, servico));
  }

  const empresaNorm = empresa ? String(empresa).trim().toUpperCase() : null;

  db.prepare(
    'UPDATE condominio_servicos SET ultima_realizacao = ?, data_vencimento = ? WHERE id = ?'
  ).run(ultimaRealizacao, dataVencimento, cs.id);

  db.prepare(`
    INSERT INTO historico (condominio_servico_id, data_realizacao, data_vencimento, empresa, registrado_por, origem, observacao, anexo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(cs.id, data, dataVencimento, empresaNorm, registradoPor || null, origem, observacao, anexo);

  return db.prepare('SELECT * FROM condominio_servicos WHERE id = ?').get(cs.id);
}

module.exports = { getServico, getOrCreateCondominioServico, periodicidadeEfetiva, registrarServico };
