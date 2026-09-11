const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'controle-periodicos-dev-secret';
const TOKEN_EXPIRA = '7d';

function gerarToken(usuario) {
  let servicos = null;
  if (usuario.servicos_permitidos) {
    try {
      servicos = typeof usuario.servicos_permitidos === 'string' 
        ? JSON.parse(usuario.servicos_permitidos) 
        : usuario.servicos_permitidos;
    } catch (e) {
      servicos = null;
    }
  }

  return jwt.sign(
    { 
      id: usuario.id, 
      nome: usuario.nome, 
      email: usuario.email, 
      papel: usuario.papel, 
      empresa_nome: usuario.empresa_nome || null,
      servicos_permitidos: servicos
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRA }
  );
}

function login(email, senha) {
  const usuario = db
    .prepare('SELECT * FROM usuarios WHERE email = ? AND ativo = 1')
    .get(String(email || '').trim().toLowerCase());
  if (!usuario) return null;
  if (!bcrypt.compareSync(String(senha || ''), usuario.senha_hash)) return null;
  return { token: gerarToken(usuario), usuario: publico(usuario) };
}

function publico(u) {
  let servicos = null;
  if (u.servicos_permitidos) {
    try {
      servicos = typeof u.servicos_permitidos === 'string' 
        ? JSON.parse(u.servicos_permitidos) 
        : u.servicos_permitidos;
    } catch (e) {
      servicos = null;
    }
  }
  return { 
    id: u.id, 
    nome: u.nome, 
    email: u.email, 
    papel: u.papel, 
    empresa_nome: u.empresa_nome || null, 
    servicos_permitidos: servicos,
    ativo: !!u.ativo 
  };
}

// Middleware: exige token válido.
function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ erro: 'Não autenticado' });
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada' });
  }
}

// Middleware: exige papel admin (usar depois de autenticar).
function exigirAdmin(req, res, next) {
  if (req.usuario?.papel !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito ao administrador' });
  }
  next();
}

module.exports = { login, autenticar, exigirAdmin, publico, JWT_SECRET };
