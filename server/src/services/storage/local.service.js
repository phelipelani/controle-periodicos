const fs = require('fs');
const path = require('path');

class LocalStorageService {
  constructor() {
    this._baseDir = null;
  }

  getBaseDir() {
    if (this._baseDir) return this._baseDir;
    const dataDir = process.env.DB_DIR ? path.resolve(process.env.DB_DIR) : path.join(__dirname, '../../../data');
    this._baseDir = path.join(dataDir, 'storage');
    if (!fs.existsSync(this._baseDir)) {
      fs.mkdirSync(this._baseDir, { recursive: true });
    }
    return this._baseDir;
  }

  resolveFullPath(relativePath) {
    const cleanRelative = String(relativePath || '').trim().replace(/^[\/\\]+/, '');
    return path.join(this.getBaseDir(), cleanRelative);
  }

  async uploadFile(relativePath, buffer, mimeType = 'application/octet-stream') {
    const fullPath = this.resolveFullPath(relativePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, buffer);
    console.log(`[LocalStorage] Arquivo salvo em disco: ${fullPath} (${(buffer.length / 1024).toFixed(1)} KB)`);

    return {
      id: null,
      name: path.basename(relativePath),
      size: buffer.length,
      path: relativePath.replace(/\\/g, '/'),
      fullPath,
      mimeType,
      provider: 'local'
    };
  }

  async getFile(relativePathOrFullPath) {
    let resolved = relativePathOrFullPath;

    // Se não for caminho absoluto, busca na pasta de storage
    if (!path.isAbsolute(resolved)) {
      resolved = this.resolveFullPath(resolved);
    }

    if (!fs.existsSync(resolved)) {
      // Tenta procurar também relativo a DB_DIR diretamente (arquivos legados adm/ ou imagens/)
      const dataDir = process.env.DB_DIR ? path.resolve(process.env.DB_DIR) : path.join(__dirname, '../../../data');
      const fallbackPath = path.join(dataDir, relativePathOrFullPath);
      if (fs.existsSync(fallbackPath)) {
        resolved = fallbackPath;
      } else {
        throw new Error(`Arquivo local não encontrado: ${relativePathOrFullPath}`);
      }
    }

    const buffer = fs.readFileSync(resolved);
    const stat = fs.statSync(resolved);
    const ext = path.extname(resolved).toLowerCase();

    let mimeType = 'application/octet-stream';
    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.webp') mimeType = 'image/webp';

    return {
      buffer,
      size: stat.size,
      name: path.basename(resolved),
      mimeType
    };
  }

  async deleteFile(relativePathOrFullPath) {
    let resolved = relativePathOrFullPath;
    if (!path.isAbsolute(resolved)) {
      resolved = this.resolveFullPath(resolved);
    }

    if (fs.existsSync(resolved)) {
      try {
        fs.unlinkSync(resolved);
        console.log(`[LocalStorage] Arquivo excluído do disco: ${resolved}`);
        return { ok: true, deletado: true };
      } catch (err) {
        console.error(`[LocalStorage] Falha ao excluir do disco:`, err);
        throw err;
      }
    }

    // Tenta também no fallback legados
    const dataDir = process.env.DB_DIR ? path.resolve(process.env.DB_DIR) : path.join(__dirname, '../../../data');
    const fallbackPath = path.join(dataDir, relativePathOrFullPath);
    if (fs.existsSync(fallbackPath)) {
      try {
        fs.unlinkSync(fallbackPath);
        return { ok: true, deletado: true };
      } catch (err) {
        throw err;
      }
    }

    return { ok: true, deletado: false, aviso: 'Arquivo não existia no disco' };
  }
}

module.exports = new LocalStorageService();
