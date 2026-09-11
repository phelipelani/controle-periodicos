const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { exigirAdmin, publico } = require('../auth');

const router = express.Router();

// Rota pública para qualquer usuário autenticado listar gerentes ativos
router.get('/gerentes', (req, res) => {
  const rows = db.prepare("SELECT id, nome, email, papel, ativo FROM usuarios WHERE papel = 'gerente' AND ativo = 1 ORDER BY nome").all();
  res.json(rows);
});

// Todas as demais rotas de gerenciamento de usuários exigem admin.
router.use(exigirAdmin);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM usuarios ORDER BY nome').all();
  res.json(rows.map(publico));
});

router.post('/', (req, res) => {
  const { nome, email, senha, papel, empresa_nome, servicos_permitidos } = req.body || {};
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
  }
  const emailNorm = String(email).trim().toLowerCase();
  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailNorm);
  if (existe) return res.status(409).json({ erro: 'Já existe um usuário com esse email' });

  const papelValido = ['admin', 'gerente', 'empresa'].includes(papel) ? papel : 'gerente';
  const empresaValida = papelValido === 'empresa' ? (empresa_nome || nome).trim().toUpperCase() : null;
  const nomeFinal = papelValido === 'empresa' ? (empresaValida || nome.trim().toUpperCase()) : nome;
  const servicosValidos = papelValido === 'empresa' && Array.isArray(servicos_permitidos)
    ? JSON.stringify(servicos_permitidos)
    : null;

  const hash = bcrypt.hashSync(String(senha), 10);
  const info = db
    .prepare("INSERT INTO usuarios (nome, email, senha_hash, papel, empresa_nome, servicos_permitidos) VALUES (?, ?, ?, ?, ?, ?)")
    .run(nomeFinal, emailNorm, hash, papelValido, empresaValida, servicosValidos);
  const novo = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(publico(novo));
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

  const { nome, papel, ativo, senha, empresa_nome, servicos_permitidos } = req.body || {};
  const papelValido = papel !== undefined ? (['admin', 'gerente', 'empresa'].includes(papel) ? papel : 'gerente') : usuario.papel;
  const rawEmpresa = empresa_nome !== undefined ? empresa_nome : (usuario.empresa_nome || nome || usuario.nome);
  const empresaValida = papelValido === 'empresa' ? (rawEmpresa ? String(rawEmpresa).trim().toUpperCase() : null) : null;
  const nomeFinal = papelValido === 'empresa' && (nome !== undefined || empresaValida)
    ? (empresaValida || String(nome || usuario.nome).trim().toUpperCase())
    : (nome ?? usuario.nome);
  const servicosValidos = papelValido === 'empresa'
    ? (servicos_permitidos !== undefined ? (Array.isArray(servicos_permitidos) ? JSON.stringify(servicos_permitidos) : null) : usuario.servicos_permitidos)
    : null;

  db.prepare(
    'UPDATE usuarios SET nome = ?, papel = ?, empresa_nome = ?, servicos_permitidos = ?, ativo = ? WHERE id = ?'
  ).run(
    nomeFinal,
    papelValido,
    empresaValida,
    servicosValidos,
    ativo === undefined ? usuario.ativo : ativo ? 1 : 0,
    id
  );
  if (senha) {
    db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(bcrypt.hashSync(String(senha), 10), id);
  }
  res.json(publico(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id)));
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.usuario.id) return res.status(400).json({ erro: 'Você não pode remover a si mesmo' });
  db.prepare('UPDATE usuarios SET ativo = 0 WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
