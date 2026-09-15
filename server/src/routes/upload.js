const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const NUVEM_CONDOMINIOS_DIR =
  process.env.NUVEM_DIR ||
  'C:\\Users\\lesco\\OneDrive - IMCosta Administradora\\Arquivos de Leandro Costa - IMCosta - IMCosta Files\\CONDOMÍNIOS';

const getUploadDirDedetizacao = (ano, codigoCondominio) => {
  let baseDir = '';
  if (fs.existsSync(NUVEM_CONDOMINIOS_DIR)) {
    baseDir = path.join(NUVEM_CONDOMINIOS_DIR, 'DEDETIZAÇÃO');
  } else {
    const dataDir = process.env.DB_DIR || path.join(__dirname, '../../data');
    baseDir = path.join(dataDir, 'adm', 'dedetizacao');
  }

  const codFormatado = codigoCondominio ? String(codigoCondominio).padStart(3, '0') : 'geral';
  const anoFinal = String(ano || new Date().getFullYear());
  const dir = path.join(baseDir, anoFinal, codFormatado);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const ano = req.body.ano || new Date().getFullYear();
      const codigoCondominio = req.body.codigo_condominio || req.body.condominio_id || req.query.codigo || req.query.condominio_id || '000';
      const dir = getUploadDirDedetizacao(ano, codigoCondominio);
      cb(null, dir);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: function (req, file, cb) {
    const ano = req.body.ano || new Date().getFullYear();
    const uniqueSuffix = Date.now().toString().slice(-6);
    const ext = path.extname(file.originalname);
    cb(null, `recibo_dedetizacao_${ano}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage: storage, limits: { fileSize: 30 * 1024 * 1024 } });

router.post('/dedetizacao/recibo', upload.single('documento'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
  }
  
  res.json({
    mensagem: 'Recibo salvo com sucesso no OneDrive!',
    caminho: req.file.path,
    filename: req.file.filename
  });
});

router.get('/preview', (req, res) => {
  const { path: filePath } = req.query;
  if (!filePath) return res.status(400).send('Caminho não informado');

  const resolved = path.resolve(filePath);
  if (fs.existsSync(resolved)) {
    res.sendFile(resolved);
  } else {
    res.status(404).send('Arquivo não encontrado');
  }
});

router.get('/download', (req, res) => {
  const { path: filePath, nome } = req.query;
  if (!filePath) return res.status(400).send('Caminho não informado');

  const resolved = path.resolve(filePath);
  if (fs.existsSync(resolved)) {
    if (nome) {
      res.download(resolved, nome);
    } else {
      res.download(resolved);
    }
  } else {
    res.status(404).send('Arquivo não encontrado');
  }
});

const getImagensDir = () => {
  const dataDir = process.env.DB_DIR || path.join(__dirname, '../../data');
  const imgDir = path.join(dataDir, 'imagens');
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
  return imgDir;
};

const storageImg = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      cb(null, getImagensDir());
    } catch (err) {
      cb(err, null);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'condominio-' + uniqueSuffix + ext);
  }
});

const uploadImg = multer({ storage: storageImg });

router.post('/condominio/imagem', uploadImg.single('imagem'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
  }
  
  res.json({
    mensagem: 'Imagem salva com sucesso!',
    url: `/api/upload/imagens/${req.file.filename}`,
    caminho: req.file.path,
    filename: req.file.filename
  });
});

router.get('/imagens/:filename', (req, res) => {
  const imgDir = getImagensDir();
  const file = path.join(imgDir, req.params.filename);
  if (fs.existsSync(file)) {
    res.sendFile(path.resolve(file));
  } else {
    res.status(404).send('Imagem não encontrada');
  }
});

module.exports = router;
