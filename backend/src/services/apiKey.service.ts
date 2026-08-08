import crypto from 'crypto';
import { ApiKeyModel, ApiKey, ApiKeyWithUser } from '../models/apiKey.model';
import { AppError } from '../utils/errors';

const KEY_PREFIX = 'jobyt_';
const KEY_BYTES = 32;

function generateRawKey(): string {
  return KEY_PREFIX + crypto.randomBytes(KEY_BYTES).toString('hex');
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export type ApiKeyScope = string;

export const ApiKeyService = {
  generateKey(): { raw: string; hash: string; prefix: string } {
    const raw = generateRawKey();
    const hash = hashKey(raw);
    const prefix = raw.substring(0, 8);
    return { raw, hash, prefix };
  },

  hashKey(key: string): string {
    return hashKey(key);
  },

  async createApiKey(
    userId: string,
    name: string,
    scopes: string[],
    permissions: Record<string, unknown> = {},
  ): Promise<{ key: ApiKey; rawKey: string }> {
    const { raw, hash, prefix } = this.generateKey();

    const key = await ApiKeyModel.create({
      user_id: userId,
      key_hash: hash,
      key_prefix: prefix,
      name,
      scopes,
      permissions,
    });

    return { key, rawKey: raw };
  },

  async validateApiKey(apiKey: string): Promise<ApiKeyWithUser> {
    const hash = hashKey(apiKey.trim());
    const result = await ApiKeyModel.findByHash(hash);

    if (!result) {
      throw new AppError('Invalid API key', 401, 'INVALID_API_KEY');
    }

    if (result.api_key.expires_at && new Date(result.api_key.expires_at) < new Date()) {
      throw new AppError('API key has expired', 401, 'API_KEY_EXPIRED');
    }

    if (!result.api_key.is_active) {
      throw new AppError('API key has been revoked', 401, 'API_KEY_REVOKED');
    }

    return result;
  },

  async touchLastUsed(apiKeyId: string): Promise<void> {
    await ApiKeyModel.touchLastUsed(apiKeyId);
  },

  listUserKeys(userId: string): Promise<ApiKey[]> {
    return ApiKeyModel.findByUserId(userId);
  },

  async updateKey(
    keyId: string,
    userId: string,
    data: { name?: string; scopes?: string[]; permissions?: Record<string, unknown> },
  ): Promise<ApiKey> {
    const updated = await ApiKeyModel.update(keyId, userId, data);
    if (!updated) {
      throw new AppError('API key not found', 404, 'NOT_FOUND');
    }
    return updated;
  },

  async revokeKey(keyId: string, userId: string): Promise<void> {
    const revoked = await ApiKeyModel.revoke(keyId, userId);
    if (!revoked) {
      throw new AppError('API key not found', 404, 'NOT_FOUND');
    }
  },

  hasScope(apiKey: ApiKey, requiredScope: string): boolean {
    return apiKey.scopes.includes(requiredScope) || apiKey.scopes.includes('*');
  },

  hasAnyScope(apiKey: ApiKey, requiredScopes: string[]): boolean {
    if (apiKey.scopes.includes('*')) return true;
    return requiredScopes.some((s) => apiKey.scopes.includes(s));
  },
};
