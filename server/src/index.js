// Carrega variáveis do server/.env (DB_DIR, PORT, ADMIN_SENHA) ANTES de abrir o banco.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

require('./db'); // inicializa o banco (migrate + seed)
const { login, autenticar } = require('./auth');
const { promoteAgendamentos, verificarNotificacoesDedetizacao } = require('./jobs');

const usuariosRoutes = require('./routes/usuarios');
const { router: condominiosRoutes } = require('./routes/condominios');
const servicosRoutes = require('./routes/servicos');
const agendamentosRoutes = require('./routes/agendamentos');
const dashboardRoutes = require('./routes/dashboard');
const historicoRoutes = require('./routes/historico');
const uploadRoutes = require('./routes/upload');
const extintoresRoutes = require('./routes/extintores');
const reservatoriosRoutes = require('./routes/reservatorios');
const segurosRoutes = require('./routes/seguros');
const spdaRoutes = require('./routes/spda');
const avcbRoutes = require('./routes/avcb');

const app = express();
const PORT = process.env.PORT || 4000;

// Configuração completa de CORS para permitir requisições de localhost, LAN e ngrok
app.use(
  cors({
    origin: true, // Reflete dinamicamente a origem da requisição (ngrok, localhost, etc.)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'ngrok-skip-browser-warning',
      'x-requested-with',
      'Accept',
      'Origin'
    ],
    exposedHeaders: ['Content-Disposition']
  })
);
app.options('*', cors());

app.use(express.json());

// --- Autenticação ---
app.post('/api/auth/login', (req, res) => {
  const { email, senha } = req.body || {};
  const resultado = login(email, senha);
  if (!resultado) return res.status(401).json({ erro: 'Email ou senha inválidos' });
  res.json(resultado);
});

app.get('/api/auth/me', autenticar, (req, res) => {
  res.json({
    id: req.usuario.id,
    nome: req.usuario.nome,
    email: req.usuario.email,
    papel: req.usuario.papel,
    empresa_nome: req.usuario.empresa_nome || null,
    servicos_permitidos: req.usuario.servicos_permitidos || null
  });
});

// --- Rotas públicas de imagem e preview de upload ---
app.use('/api/upload', uploadRoutes);

// --- Rotas protegidas (com exceção para adesão pública de dedetização) ---
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/agendamentos/adesao/')) {
    return next();
  }
  return autenticar(req, res, next);
});
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/condominios', condominiosRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/extintores', extintoresRoutes);
app.use('/api/reservatorios', reservatoriosRoutes);
app.use('/api/seguros', segurosRoutes);
app.use('/api/spda', spdaRoutes);
app.use('/api/avcb', avcbRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/historico', historicoRoutes);
app.use('/api/upload', uploadRoutes);

// --- Servir o frontend já compilado (web/dist), se existir ---
// Em produção (no PC servidor) um único processo serve o site + a API na mesma
// porta, acessível por qualquer máquina da rede.
const distDir = path.join(__dirname, '..', '..', 'web', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // SPA: qualquer rota que não seja /api devolve o index.html.
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

// Promove agendamentos e verifica notificações de dedetização no boot e todo dia às 00:05.
promoteAgendamentos();
verificarNotificacoesDedetizacao();
cron.schedule('5 0 * * *', () => {
  promoteAgendamentos();
  verificarNotificacoesDedetizacao();
});

// Mostra os IPs da rede para acesso a partir de outras máquinas.
function ipsDaRede() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

// Escuta em 0.0.0.0 para aceitar conexões da rede local (não só localhost).
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nControle de Periódicos rodando:`);
  console.log(`  • neste PC:        http://localhost:${PORT}`);
  for (const ip of ipsDaRede()) {
    console.log(`  • na rede (LAN):   http://${ip}:${PORT}`);
  }
  if (!fs.existsSync(distDir)) {
    console.log(`  (site ainda não compilado — rode "npm run build" para servir aqui; em dev use o Vite na 5173)`);
  }
  console.log('');
});
