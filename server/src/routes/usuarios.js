const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { exigirAdmin, publico } = require('../auth');

const router = express.Router();

// Todas as rotas de usuários exigem admin.
router.use(exigirAdmin);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM usuarios ORDER BY nome').all();
  res.json(rows.map(publico));
});

router.post('/', (req, res) => {
  const { nome, email, senha, papel } = req.body || {};
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
  }
  const emailNorm = String(email).trim().toLowerCase();
  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailNorm);
  if (existe) return res.status(409).json({ erro: 'Já existe um usuário com esse email' });

  const hash = bcrypt.hashSync(String(senha), 10);
  const info = db
    .prepare("INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)")
    .run(nome, emailNorm, hash, papel === 'admin' ? 'admin' : 'gerente');
  const novo = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(publico(novo));
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

  const { nome, papel, ativo, senha } = req.body || {};
  db.prepare(
    'UPDATE usuarios SET nome = ?, papel = ?, ativo = ? WHERE id = ?'
  ).run(
    nome ?? usuario.nome,
    papel === 'admin' ? 'admin' : 'gerente',
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
