const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const getUploadDir = () => {
  const year = new Date().getFullYear();
  // Z:\DEDETIZAÇÃO\DDT 2026\recibos
  const uploadDir = path.join('Z:', 'DEDETIZAÇÃO', `DDT ${year}`, 'recibos');
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const dir = getUploadDir();
      cb(null, dir);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

router.post('/dedetizacao/recibo', upload.single('documento'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
  }
  
  res.json({
    mensagem: 'Arquivo salvo com sucesso!',
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
