import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/apiKey.service';
import { sendSuccess } from '../utils/response';

export const ApiKeyController = {
  async listKeys(req: Request, res: Response, next: NextFunction) {
    try {
      const keys = await ApiKeyService.listUserKeys(req.user!.userId);
      const sanitized = keys.map((k) => ({
        id: k.id,
        key_prefix: k.key_prefix,
        name: k.name,
        scopes: k.scopes,
        rate_limit: k.rate_limit,
        expires_at: k.expires_at,
        last_used_at: k.last_used_at,
        is_active: k.is_active,
        created_at: k.created_at,
      }));
      sendSuccess(res, sanitized);
    } catch (err) {
      next(err);
    }
  },

  async createKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, scopes, permissions } = req.body;

      if (!name || !scopes || !Array.isArray(scopes) || scopes.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'BAD_REQUEST',
          message: 'name and scopes are required',
        });
      }

      const { key, rawKey } = await ApiKeyService.createApiKey(
        req.user!.userId,
        name,
        scopes,
        permissions || {},
      );

      res.status(201).json({
        success: true,
        message: 'API key created. Save this key now — it will not be shown again.',
        data: {
          id: key.id,
          key_prefix: key.key_prefix,
          name: key.name,
          scopes: key.scopes,
          api_key: rawKey,
          created_at: key.created_at,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async updateKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, scopes, permissions } = req.body;
      const updated = await ApiKeyService.updateKey(String(id), req.user!.userId as string, { name, scopes, permissions });
      const sanitized = {
        id: updated.id,
        key_prefix: updated.key_prefix,
        name: updated.name,
        scopes: updated.scopes,
        rate_limit: updated.rate_limit,
        expires_at: updated.expires_at,
        last_used_at: updated.last_used_at,
        is_active: updated.is_active,
        created_at: updated.created_at,
      };
      sendSuccess(res, sanitized, 'API key updated');
    } catch (err) {
      next(err);
    }
  },

  async revokeKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await ApiKeyService.revokeKey(String(id), req.user!.userId as string);
      sendSuccess(res, null, 'API key revoked');
    } catch (err) {
      next(err);
    }
  },
};
