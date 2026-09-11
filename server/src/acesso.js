// Controle de acesso por perfil:
// - admin: vê tudo;
// - gerente: vê apenas os condomínios onde gerente_id = usuario.id;
// - empresa: vê apenas os condomínios onde prestou serviço nos serviços aos quais tem permissão.
const db = require('./db');

function ehAdmin(usuario) {
  return usuario?.papel === 'admin' || usuario?.papel === 'administrador';
}

function ehEmpresa(usuario) {
  return usuario?.papel === 'empresa';
}

// Verifica se o usuário tem permissão para acessar um serviço específico (pela chave do serviço, ex: 'dedetizacao', 'reservatorio')
function podeAcessarServico(usuario, servicoChave) {
  if (!usuario || ehAdmin(usuario) || usuario.papel === 'gerente') return true;
  if (!ehEmpresa(usuario)) return false;

  let permitidos = usuario.servicos_permitidos;
  if (typeof permitidos === 'string') {
    try { permitidos = JSON.parse(permitidos); } catch (e) { permitidos = []; }
  }
  if (!Array.isArray(permitidos) || permitidos.length === 0) {
    // Se não tiver nenhum serviço explicitado, permite os serviços onde tem registro de nome
    return true;
  }
  return permitidos.includes(servicoChave);
}

// IDs de condomínios que o usuário pode ver. Retorna null quando pode ver todos (admin).
function idsCondominiosVisiveis(usuario, servicoChave = null) {
  if (!usuario || ehAdmin(usuario)) return null;

  if (ehEmpresa(usuario)) {
    const nomeEmpresa = (usuario.empresa_nome || usuario.nome || '').trim();
    if (!nomeEmpresa) return [];

    let servicosPermitidos = usuario.servicos_permitidos;
    if (typeof servicosPermitidos === 'string') {
      try { servicosPermitidos = JSON.parse(servicosPermitidos); } catch (e) { servicosPermitidos = null; }
    }

    // Se o serviço solicitado não está na lista permitida da empresa, retorna lista vazia
    if (servicoChave && servicosPermitidos && Array.isArray(servicosPermitidos) && !servicosPermitidos.includes(servicoChave)) {
      return [];
    }

    // Buscar condomínios vinculados a esta empresa em historico ou agendamentos
    const rows = db
      .prepare(`
        SELECT DISTINCT c.id
        FROM condominios c
        LEFT JOIN condominio_servicos cs ON cs.condominio_id = c.id
        LEFT JOIN servicos s ON s.id = cs.servico_id
        LEFT JOIN historico h ON h.condominio_servico_id = cs.id
        LEFT JOIN agendamentos ag ON ag.condominio_id = c.id
        LEFT JOIN servicos s_ag ON s_ag.id = ag.servico_id
        WHERE (
          (LOWER(TRIM(COALESCE(h.empresa, ''))) = LOWER(?) ${servicoChave ? 'AND s.chave = ?' : ''})
          OR
          (LOWER(TRIM(COALESCE(ag.empresa, ''))) = LOWER(?) ${servicoChave ? 'AND s_ag.chave = ?' : ''})
        )
      `)
      .all(...(servicoChave ? [nomeEmpresa, servicoChave, nomeEmpresa, servicoChave] : [nomeEmpresa, nomeEmpresa]));

    return rows.map((r) => r.id);
  }

  // Gerente
  return db
    .prepare('SELECT id FROM condominios WHERE gerente_id = ?')
    .all(usuario.id)
    .map((r) => r.id);
}

function podeAcessarCondominio(usuario, condominioId) {
  if (!usuario || ehAdmin(usuario)) return true;
  const ids = idsCondominiosVisiveis(usuario);
  return ids ? ids.includes(Number(condominioId)) : false;
}

// Monta um fragmento "coluna IN (...)" para filtrar listas por escopo do usuário.
function filtroEscopo(usuario, coluna, servicoChave = null) {
  if (!usuario || ehAdmin(usuario)) return { sql: '1=1', params: [] };
  const ids = idsCondominiosVisiveis(usuario, servicoChave);
  if (!ids || ids.length === 0) return { sql: '1=0', params: [] };
  return { sql: `${coluna} IN (${ids.map(() => '?').join(',')})`, params: ids };
}

// Grava registro de auditoria para rastrear todas as alterações no sistema
function registrarAuditoria(req, acao, entidade, entidadeId, detalhes = null) {
  try {
    const usuario = req?.usuario;
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const detalhesStr = typeof detalhes === 'object' && detalhes !== null ? JSON.stringify(detalhes) : String(detalhes || '');

    let usuarioId = null;
    if (usuario?.id) {
      const existe = db.prepare('SELECT id FROM usuarios WHERE id = ?').get(usuario.id);
      if (existe) usuarioId = usuario.id;
    }

    db.prepare(`
      INSERT INTO auditoria (usuario_id, usuario_nome, papel, acao, entidade, entidade_id, detalhes, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      usuarioId,
      usuario?.nome || 'Anônimo',
      usuario?.papel || 'desconhecido',
      acao,
      entidade,
      entidadeId || null,
      detalhesStr || null,
      ip
    );
  } catch (err) {
    console.error('[Auditoria] Erro ao registrar log de auditoria:', err);
  }
}

function ehCorretora(usuario) {
  if (!usuario) return false;
  if (usuario.papel === 'corretora') return true;
  if (usuario.papel === 'empresa') {
    let permitidos = usuario.servicos_permitidos;
    if (typeof permitidos === 'string') {
      try { permitidos = JSON.parse(permitidos); } catch (e) { permitidos = []; }
    }
    return Array.isArray(permitidos) && permitidos.includes('seguro');
  }
  return false;
}

function podeEditarDadosCadastrais(usuario) {
  if (!usuario) return false;
  return usuario.papel === 'admin' || usuario.papel === 'gerente';
}

// Grava registros de auditoria detalhados por campo
function registrarAuditoriaDetalhada(req, entidade, entidadeId, acao, alteracoes = []) {
  try {
    const usuario = req?.usuario;
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    let usuarioId = null;
    if (usuario?.id) {
      const existe = db.prepare('SELECT id FROM usuarios WHERE id = ?').get(usuario.id);
      if (existe) usuarioId = usuario.id;
    }

    const insert = db.prepare(`
      INSERT INTO auditoria (usuario_id, usuario_nome, papel, acao, entidade, entidade_id, campo, valor_anterior, valor_novo, detalhes, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (alteracoes && alteracoes.length > 0) {
      for (const alt of alteracoes) {
        insert.run(
          usuarioId,
          usuario?.nome || 'Anônimo',
          usuario?.papel || 'desconhecido',
          acao,
          entidade,
          entidadeId || null,
          alt.campo || null,
          alt.anterior != null ? String(alt.anterior) : null,
          alt.novo != null ? String(alt.novo) : null,
          alt.detalhes || null,
          ip
        );
      }
    } else {
      insert.run(
        usuarioId,
        usuario?.nome || 'Anônimo',
        usuario?.papel || 'desconhecido',
        acao,
        entidade,
        entidadeId || null,
        null,
        null,
        null,
        null,
        ip
      );
    }
  } catch (err) {
    console.error('[Auditoria] Erro ao registrar log detalhado:', err);
  }
}

module.exports = { 
  ehAdmin, 
  ehEmpresa, 
  ehCorretora,
  podeEditarDadosCadastrais,
  podeAcessarServico,
  idsCondominiosVisiveis, 
  podeAcessarCondominio, 
  filtroEscopo,
  registrarAuditoria,
  registrarAuditoriaDetalhada
};

