const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const storageService = require('../services/storage/storage.service');

// Upload em memória para repassar diretamente ao StorageService (sem arquivos temporários em disco)
const uploadMemoria = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }
});

// ============================================================
// 0. Status do Provedor de Armazenamento (OneDrive / Local)
// ============================================================
router.get('/status', async (req, res) => {
  try {
    const status = await storageService.testConnection();
    res.json(status);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao verificar status do storage: ' + err.message });
  }
});

// ============================================================
// 1. Upload de Recibo / Comprovante (Dedetização / Geral)
// ============================================================
router.post('/dedetizacao/recibo', uploadMemoria.single('documento'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
  }

  try {
    const ano = req.query.ano || req.body.ano || new Date().getFullYear();
    const rawCod =
      req.query.codigo_condominio ||
      req.query.codigo ||
      req.query.condominio_id ||
      req.body.codigo_condominio ||
      req.body.condominio_id ||
      req.params.condominioId ||
      req.params.id ||
      '001';

    const ext = path.extname(req.file.originalname) || '.pdf';
    const uniqueSuffix = Date.now().toString().slice(-6);
    const customFilename = `recibo_dedetizacao_${ano}_${uniqueSuffix}${ext}`;

    const uploaded = await storageService.upload({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      modulo: 'DEDETIZAÇÃO',
      ano,
      codigoCondominio: rawCod,
      customFilename
    });

    res.json({
      mensagem: `Recibo salvo com sucesso no ${uploaded.provider === 'onedrive' ? 'OneDrive' : 'armazenamento'}!`,
      caminho: uploaded.path,
      filename: uploaded.name,
      url: uploaded.url,
      provider: uploaded.provider
    });
  } catch (err) {
    console.error('[Upload /dedetizacao/recibo] Erro:', err);
    res.status(500).json({ erro: 'Erro ao salvar recibo: ' + err.message });
  }
});

// ============================================================
// 2. Upload de Imagem de Condomínio
// ============================================================
router.post('/condominio/imagem', uploadMemoria.single('imagem'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
  }

  try {
    const ext = path.extname(req.file.originalname) || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const customFilename = `condominio-${uniqueSuffix}${ext}`;

    const uploaded = await storageService.upload({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      modulo: 'IMAGENS',
      customFilename
    });

    res.json({
      mensagem: 'Imagem salva com sucesso!',
      url: uploaded.url,
      caminho: uploaded.path,
      filename: uploaded.name,
      provider: uploaded.provider
    });
  } catch (err) {
    console.error('[Upload /condominio/imagem] Erro:', err);
    res.status(500).json({ erro: 'Erro ao salvar imagem: ' + err.message });
  }
});

// ============================================================
// 3. Visualização (Preview Inline) de Arquivos / PDFs / Imagens
// ============================================================
router.get('/preview', async (req, res) => {
  const { path: filePath } = req.query;
  if (!filePath) return res.status(400).send('Caminho não informado');

  try {
    const fileData = await storageService.getFile(filePath);
    
    res.setHeader('Content-Type', fileData.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', fileData.size);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileData.name)}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    return res.send(fileData.buffer);
  } catch (err) {
    console.error('[Upload /preview] Arquivo não encontrado:', filePath, err.message);
    return res.status(404).send('Arquivo não encontrado ou inacessível no armazenamento');
  }
});

// Rota de compatibilidade para imagens antigas
router.get('/imagens/:filename', async (req, res) => {
  const filename = req.params.filename;
  try {
    const fileData = await storageService.getFile(`IMAGENS/${filename}`);
    res.setHeader('Content-Type', fileData.mimeType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(fileData.buffer);
  } catch (err) {
    // Tenta direto pelo filename no storage legado
    try {
      const fileData = await storageService.getFile(filename);
      res.setHeader('Content-Type', fileData.mimeType || 'image/jpeg');
      return res.send(fileData.buffer);
    } catch (e) {
      return res.status(404).send('Imagem não encontrada');
    }
  }
});

// ============================================================
// 4. Download de Arquivos com Nome Original
// ============================================================
router.get('/download', async (req, res) => {
  const { path: filePath, nome } = req.query;
  if (!filePath) return res.status(400).send('Caminho não informado');

  try {
    const fileData = await storageService.getFile(filePath);
    const downloadName = nome || fileData.name || 'arquivo';

    res.setHeader('Content-Type', fileData.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', fileData.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
    
    return res.send(fileData.buffer);
  } catch (err) {
    console.error('[Upload /download] Arquivo não encontrado:', filePath, err.message);
    return res.status(404).send('Arquivo não encontrado ou inacessível');
  }
});

// ============================================================
// 5. Deletar Arquivo do Armazenamento e Limpar Referências no Banco
// ============================================================
const removerArquivo = async (req, res) => {
  const filePath = req.query.path || req.body?.path;
  if (!filePath) {
    return res.status(400).json({ erro: 'Caminho do arquivo não informado.' });
  }

  try {
    // 1. Remover do provedor de armazenamento (OneDrive / Local)
    const delResult = await storageService.deleteFile(filePath);

    // 2. Limpar referências no banco de dados SQLite
    try {
      db.prepare('UPDATE historico SET anexo = NULL WHERE anexo = ?').run(filePath);
      db.prepare('UPDATE agendamentos SET anexo = NULL WHERE anexo = ?').run(filePath);
      db.prepare('UPDATE reservatorios_detalhes SET anexo = NULL WHERE anexo = ?').run(filePath);
      db.prepare('UPDATE extintores_detalhes SET anexo = NULL WHERE anexo = ?').run(filePath);
    } catch (dbErr) {
      console.error('[Upload] Erro ao limpar referências do arquivo no banco:', dbErr);
    }

    return res.json({
      ok: true,
      mensagem: delResult.deletado ? 'Arquivo excluído do armazenamento com sucesso!' : 'Arquivo desvinculado.',
      deletado: delResult.deletado
    });
  } catch (err) {
    console.error('[Upload] Erro ao processar exclusão de arquivo:', err);
    return res.status(500).json({ erro: 'Erro ao excluir arquivo: ' + err.message });
  }
};

router.delete('/arquivo', removerArquivo);
router.post('/remover', removerArquivo);

module.exports = router;

