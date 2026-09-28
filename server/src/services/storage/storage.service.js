const path = require('path');
const fs = require('fs');
const onedriveService = require('./onedrive.service');
const localService = require('./local.service');

class StorageService {
  /**
   * Verifica se o backend está conectado diretamente ao Microsoft OneDrive via Graph API.
   */
  isOneDriveConfigured() {
    return onedriveService.isConfigured();
  }

  /**
   * Retorna o provedor de armazenamento ativo (OneDrive ou Local Fallback).
   */
  getProvider() {
    if (this.isOneDriveConfigured()) {
      return onedriveService;
    }
    return localService;
  }

  /**
   * Sanitiza nomes de arquivos para evitar Directory Traversal (../) e caracteres ilegais.
   */
  sanitizeFilename(originalName) {
    if (!originalName || typeof originalName !== 'string') {
      return `arquivo_${Date.now()}`;
    }

    const ext = path.extname(originalName).toLowerCase();
    const base = path.basename(originalName, ext);

    // Remove caracteres proibidos em Windows/OneDrive (" * : < > ? / \ |) e sequências perigosas
    let cleanBase = base
      .replace(/[\/\\?%*:|"<>]/g, '_')
      .replace(/\.{2,}/g, '.')
      .replace(/\s+/g, '_')
      .replace(/[^\w.-]/g, '_')
      .slice(0, 80);

    if (!cleanBase) cleanBase = 'arquivo';

    return `${cleanBase}${ext}`;
  }

  /**
   * Constrói o caminho lógico padronizado para as pastas no OneDrive/Storage.
   * Exemplo: DEDETIZAÇÃO/2026/001/recibo_2026_123456.pdf
   */
  buildLogicalPath({ modulo = 'GERAL', ano, codigoCondominio, filename }) {
    const anoStr = String(ano || new Date().getFullYear());
    let codFormatado = '001';

    if (codigoCondominio !== undefined && codigoCondominio !== null && String(codigoCondominio).trim() !== '') {
      const num = parseInt(codigoCondominio, 10);
      codFormatado = !isNaN(num) && num > 0 ? String(num).padStart(3, '0') : String(codigoCondominio).padStart(3, '0');
    }

    const moduloLimpo = String(modulo).toUpperCase().replace(/[^A-Z0-9_À-Ú]/gi, '_');

    if (moduloLimpo === 'IMAGENS' || moduloLimpo === 'SISTEMA') {
      return `${moduloLimpo}/${filename}`;
    }

    return `${moduloLimpo}/${anoStr}/${codFormatado}/${filename}`;
  }

  /**
   * Upload de arquivo (Buffer em memória).
   */
  async upload({ buffer, originalname, mimetype, modulo, ano, codigoCondominio, customPath, customFilename }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('Nenhum buffer de arquivo fornecido para upload.');
    }

    const safeFilename = customFilename || this.sanitizeFilename(originalname);
    const logicalPath = customPath || this.buildLogicalPath({
      modulo,
      ano,
      codigoCondominio,
      filename: safeFilename
    });

    const provider = this.getProvider();
    const result = await provider.uploadFile(logicalPath, buffer, mimetype);

    return {
      id: result.id || null,
      name: safeFilename,
      size: result.size,
      path: logicalPath.replace(/\\/g, '/'),
      url: `/api/upload/preview?path=${encodeURIComponent(logicalPath.replace(/\\/g, '/'))}`,
      mimeType: result.mimeType || mimetype || 'application/octet-stream',
      provider: result.provider
    };
  }

  /**
   * Obtém arquivo para visualização (preview) ou download.
   * Suporta caminhos lógicos do OneDrive, IDs do Graph e caminhos locais legados para retrocompatibilidade.
   */
  async getFile(pathOrId) {
    if (!pathOrId) {
      throw new Error('Caminho ou ID do arquivo não informado.');
    }

    const identifier = String(pathOrId).trim();

    // 1. Se for um caminho absoluto legado que existe fisicamente no disco deste servidor
    if (path.isAbsolute(identifier) && fs.existsSync(identifier)) {
      return await localService.getFile(identifier);
    }

    // 2. Se o OneDrive estiver configurado, tenta buscar no OneDrive
    if (this.isOneDriveConfigured()) {
      try {
        return await onedriveService.getFile(identifier);
      } catch (err) {
        console.warn(`[StorageService] Não encontrado no OneDrive, tentando fallback local: ${identifier}`);
      }
    }

    // 3. Fallback: tenta buscar no storage local
    return await localService.getFile(identifier);
  }

  /**
   * Exclui arquivo do armazenamento (OneDrive e disco local se existir cópia).
   */
  async deleteFile(pathOrId) {
    if (!pathOrId) {
      throw new Error('Caminho ou ID do arquivo não informado.');
    }

    const identifier = String(pathOrId).trim();
    let deletado = false;

    // Se o OneDrive estiver configurado, remove do OneDrive
    if (this.isOneDriveConfigured()) {
      try {
        const res = await onedriveService.deleteFile(identifier);
        if (res.ok) deletado = true;
      } catch (err) {
        console.warn(`[StorageService] Falha ao deletar do OneDrive: ${err.message}`);
      }
    }

    // Também tenta remover do disco local (para arquivos legados ou cópias em cache)
    try {
      const resLocal = await localService.deleteFile(identifier);
      if (resLocal.deletado) deletado = true;
    } catch (e) {}

    return { ok: true, deletado };
  }

  /**
   * Diagnóstico e teste de conexão do Storage.
   */
  async testConnection() {
    if (this.isOneDriveConfigured()) {
      return await onedriveService.testConnection();
    }

    return {
      ok: true,
      configurado: false,
      provedor: 'local',
      pastaLocal: localService.getBaseDir(),
      mensagem: 'Microsoft Graph não configurado. Utilizando armazenamento local para desenvolvimento.'
    };
  }
}

module.exports = new StorageService();
