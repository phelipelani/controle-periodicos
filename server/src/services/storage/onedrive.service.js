const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');
const path = require('path');

class OneDriveService {
  constructor() {
    this._client = null;
    this._credential = null;
    this._lastTenantId = null;
    this._lastClientId = null;
  }

  /**
   * Verifica se as credenciais mínimas da Microsoft Graph API estão configuradas no ambiente.
   */
  isConfigured() {
    const tenantId = process.env.MICROSOFT_TENANT_ID;
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const hasTarget = Boolean(process.env.ONEDRIVE_DRIVE_ID || process.env.ONEDRIVE_USER_ID);

    return Boolean(tenantId && clientId && clientSecret && hasTarget);
  }

  /**
   * Obtém ou inicializa o cliente autenticado do Microsoft Graph.
   */
  getClient() {
    if (!this.isConfigured()) {
      throw new Error(
        'OneDrive não configurado. Verifique as variáveis MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET e (ONEDRIVE_DRIVE_ID ou ONEDRIVE_USER_ID) no arquivo .env'
      );
    }

    const tenantId = process.env.MICROSOFT_TENANT_ID;
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    // Reinicializa caso o .env tenha sido alterado em tempo de execução
    if (!this._client || this._lastTenantId !== tenantId || this._lastClientId !== clientId) {
      this._credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
      const authProvider = new TokenCredentialAuthenticationProvider(this._credential, {
        scopes: ['https://graph.microsoft.com/.default']
      });

      this._client = Client.initWithMiddleware({
        authProvider
      });

      this._lastTenantId = tenantId;
      this._lastClientId = clientId;
    }

    return this._client;
  }

  /**
   * Retorna o endpoint base do Drive conforme configurado (Drive ID, User ID ou fallback).
   */
  getDriveBasePath() {
    if (process.env.ONEDRIVE_DRIVE_ID) {
      return `/drives/${process.env.ONEDRIVE_DRIVE_ID.trim()}`;
    }
    if (process.env.ONEDRIVE_USER_ID) {
      return `/users/${process.env.ONEDRIVE_USER_ID.trim()}/drive`;
    }
    return '/me/drive';
  }

  /**
   * Normaliza e resolve o caminho lógico completo dentro do OneDrive.
   * Adiciona o prefixo ONEDRIVE_ROOT_FOLDER se configurado.
   */
  resolveFullPath(relativePath) {
    const rootFolder = (process.env.ONEDRIVE_ROOT_FOLDER || '').trim().replace(/^[\/\\]+|[\/\\]+$/g, '');
    const cleanRelative = String(relativePath || '').trim().replace(/^[\/\\]+/, '').replace(/\\/g, '/');

    if (rootFolder) {
      return `${rootFolder}/${cleanRelative}`;
    }
    return cleanRelative;
  }

  /**
   * Codifica o caminho para uso na URL do Microsoft Graph API (/root:/path:/content).
   */
  encodePathForUrl(fullPath) {
    return fullPath
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');
  }

  /**
   * Realiza upload de arquivo (Buffer) para o OneDrive.
   * Para arquivos até 4MB: upload direto via PUT.
   * Para arquivos maiores que 4MB: upload em chunks via UploadSession.
   */
  async uploadFile(relativePath, buffer, mimeType = 'application/octet-stream') {
    const client = this.getClient();
    const driveBase = this.getDriveBasePath();
    const fullPath = this.resolveFullPath(relativePath);
    const encodedPath = this.encodePathForUrl(fullPath);
    const fileName = path.basename(fullPath);

    console.log(`[OneDrive] Iniciando upload: ${fullPath} (${(buffer.length / 1024).toFixed(1)} KB)`);

    // 1. Arquivos até 4MB (4 * 1024 * 1024 bytes): PUT simples
    if (buffer.length <= 4 * 1024 * 1024) {
      try {
        const item = await client
          .api(`${driveBase}/root:/${encodedPath}:/content`)
          .header('Content-Type', mimeType)
          .put(buffer);

        console.log(`[OneDrive] Upload concluído com sucesso: ${fullPath} (Item ID: ${item.id})`);
        return {
          id: item.id,
          name: item.name || fileName,
          size: item.size || buffer.length,
          webUrl: item.webUrl,
          path: relativePath,
          fullPath,
          mimeType: item.file?.mimeType || mimeType,
          provider: 'onedrive'
        };
      } catch (err) {
        console.error(`[OneDrive] Erro no upload simples de ${fullPath}:`, err.message);
        throw this._formatError(err, `Falha no upload para o OneDrive (${fullPath})`);
      }
    }

    // 2. Arquivos maiores que 4MB: Upload Session em chunks
    try {
      console.log(`[OneDrive] Arquivo grande detectado. Criando Upload Session para: ${fullPath}`);
      const sessionPayload = {
        item: {
          '@microsoft.graph.conflictBehavior': 'replace',
          name: fileName
        }
      };

      const uploadSession = await client
        .api(`${driveBase}/root:/${encodedPath}:/createUploadSession`)
        .post(sessionPayload);

      const uploadUrl = uploadSession.uploadUrl;
      const totalSize = buffer.length;
      const chunkSize = 320 * 1024 * 10; // 3.2 MB (múltiplo de 320 KB exigido pelo Graph)
      let offset = 0;
      let lastResult = null;

      while (offset < totalSize) {
        const end = Math.min(offset + chunkSize, totalSize);
        const chunk = buffer.subarray(offset, end);
        const contentRange = `bytes ${offset}-${end - 1}/${totalSize}`;

        const res = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': String(chunk.length),
            'Content-Range': contentRange
          },
          body: chunk
        });

        if (!res.ok && res.status !== 202 && res.status !== 200 && res.status !== 201) {
          const errText = await res.text();
          throw new Error(`Falha no chunk ${contentRange}: HTTP ${res.status} - ${errText}`);
        }

        if (res.status === 200 || res.status === 201) {
          lastResult = await res.json();
          break;
        }

        offset = end;
      }

      console.log(`[OneDrive] Upload em sessão concluído com sucesso: ${fullPath}`);
      return {
        id: lastResult?.id || null,
        name: lastResult?.name || fileName,
        size: lastResult?.size || totalSize,
        webUrl: lastResult?.webUrl,
        path: relativePath,
        fullPath,
        mimeType: lastResult?.file?.mimeType || mimeType,
        provider: 'onedrive'
      };
    } catch (err) {
      console.error(`[OneDrive] Erro no upload em sessão de ${fullPath}:`, err.message);
      throw this._formatError(err, `Falha no upload em partes para o OneDrive (${fullPath})`);
    }
  }

  /**
   * Baixa um arquivo do OneDrive e retorna Buffer + Metadados.
   */
  async getFile(relativePathOrId) {
    const client = this.getClient();
    const driveBase = this.getDriveBasePath();

    let metaEndpoint = '';
    let contentEndpoint = '';
    let identifier = String(relativePathOrId || '').trim();

    // Se for ID direto do Graph (normalmente sem barras) ou caminho lógico
    if (!identifier.includes('/') && !identifier.includes('\\') && identifier.length > 20) {
      metaEndpoint = `${driveBase}/items/${identifier}`;
      contentEndpoint = `${driveBase}/items/${identifier}/content`;
    } else {
      const fullPath = this.resolveFullPath(identifier);
      const encodedPath = this.encodePathForUrl(fullPath);
      metaEndpoint = `${driveBase}/root:/${encodedPath}`;
      contentEndpoint = `${driveBase}/root:/${encodedPath}:/content`;
    }

    try {
      // 1. Obter metadados (nome, mimetype, tamanho)
      let metadata = {};
      try {
        metadata = await client.api(metaEndpoint).get();
      } catch (e) {
        // Se falhar metadados, tenta baixar o conteúdo diretamente
      }

      // 2. Obter conteúdo binário (ArrayBuffer)
      const streamOrBuffer = await client.api(contentEndpoint).responseType('arraybuffer').get();
      const buffer = Buffer.from(streamOrBuffer);

      return {
        buffer,
        size: metadata.size || buffer.length,
        name: metadata.name || path.basename(identifier),
        mimeType: metadata.file?.mimeType || 'application/octet-stream'
      };
    } catch (err) {
      console.error(`[OneDrive] Erro ao buscar arquivo ${identifier}:`, err.message);
      throw this._formatError(err, `Arquivo não encontrado ou inacessível no OneDrive (${identifier})`);
    }
  }

  /**
   * Exclui um arquivo do OneDrive pelo caminho lógico ou ID.
   */
  async deleteFile(relativePathOrId) {
    const client = this.getClient();
    const driveBase = this.getDriveBasePath();
    let identifier = String(relativePathOrId || '').trim();
    let endpoint = '';

    if (!identifier.includes('/') && !identifier.includes('\\') && identifier.length > 20) {
      endpoint = `${driveBase}/items/${identifier}`;
    } else {
      const fullPath = this.resolveFullPath(identifier);
      const encodedPath = this.encodePathForUrl(fullPath);
      endpoint = `${driveBase}/root:/${encodedPath}`;
    }

    try {
      console.log(`[OneDrive] Excluindo item: ${identifier}`);
      await client.api(endpoint).delete();
      console.log(`[OneDrive] Item excluído com sucesso: ${identifier}`);
      return { ok: true, deletado: true };
    } catch (err) {
      // Se for 404, já não existe no OneDrive
      if (err.statusCode === 404 || err.status === 404) {
        console.warn(`[OneDrive] Item já não existia no OneDrive: ${identifier}`);
        return { ok: true, deletado: false, aviso: 'Item não encontrado no OneDrive' };
      }
      console.error(`[OneDrive] Erro ao excluir item ${identifier}:`, err.message);
      throw this._formatError(err, `Erro ao excluir arquivo no OneDrive (${identifier})`);
    }
  }

  /**
   * Valida a conexão com o Microsoft Graph e com o Drive configurado.
   */
  async testConnection() {
    if (!this.isConfigured()) {
      return {
        ok: false,
        configurado: false,
        motivo: 'Variáveis de ambiente do Microsoft Graph / OneDrive não preenchidas no .env'
      };
    }

    try {
      const client = this.getClient();
      const driveBase = this.getDriveBasePath();
      const driveInfo = await client.api(driveBase).get();

      return {
        ok: true,
        configurado: true,
        driveId: driveInfo.id,
        driveName: driveInfo.name,
        driveType: driveInfo.driveType,
        owner: driveInfo.owner?.user?.displayName || driveInfo.owner?.user?.email || 'Organização',
        rootFolder: process.env.ONEDRIVE_ROOT_FOLDER || '(raiz do drive)'
      };
    } catch (err) {
      return {
        ok: false,
        configurado: true,
        erro: err.message,
        statusCode: err.statusCode || err.status || 500
      };
    }
  }

  /**
   * Formata os erros do Microsoft Graph para respostas limpas e seguras.
   */
  _formatError(err, defaultMsg) {
    const error = new Error(`${defaultMsg}: ${err.message || 'Erro de comunicação com a Graph API'}`);
    error.statusCode = err.statusCode || err.status || 500;
    error.graphCode = err.code;
    return error;
  }
}

module.exports = new OneDriveService();
