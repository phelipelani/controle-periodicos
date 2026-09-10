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
    // Generate a unique name or keep original, let's keep original + timestamp to avoid conflicts
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

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Arquivo não encontrado no disco local Z:');
  }
});

module.exports = router;
