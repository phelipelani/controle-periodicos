// Controle de acesso por gerente: admin vê tudo; gerente só os condomínios dele.
const db = require('./db');

function ehAdmin(usuario) {
  return usuario?.papel === 'admin';
}

// IDs de condomínios que o usuário pode ver. Retorna null quando pode ver todos (admin).
function idsCondominiosVisiveis(usuario) {
  if (ehAdmin(usuario)) return null;
  return db
    .prepare('SELECT id FROM condominios WHERE gerente_id = ?')
    .all(usuario.id)
    .map((r) => r.id);
}

function podeAcessarCondominio(usuario, condominioId) {
  if (ehAdmin(usuario)) return true;
  const c = db.prepare('SELECT gerente_id FROM condominios WHERE id = ?').get(condominioId);
  return !!c && c.gerente_id === usuario.id;
}

// Monta um fragmento "coluna IN (...)" para filtrar listas por escopo do usuário.
// Para admin retorna filtro neutro. Para gerente sem condomínios, retorna algo
// que não casa com nada.
function filtroEscopo(usuario, coluna) {
  if (ehAdmin(usuario)) return { sql: '1=1', params: [] };
  const ids = idsCondominiosVisiveis(usuario);
  if (ids.length === 0) return { sql: '1=0', params: [] };
  return { sql: `${coluna} IN (${ids.map(() => '?').join(',')})`, params: ids };
}

module.exports = { ehAdmin, idsCondominiosVisiveis, podeAcessarCondominio, filtroEscopo };
