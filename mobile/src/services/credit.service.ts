import { api } from '../lib/api';
import { CreditBalance, CreditLedgerEntry, APIResponse } from '../types';

export const creditService = {
  async getBalance(): Promise<APIResponse<CreditBalance>> {
    const response = await api.get<APIResponse<CreditBalance>>('/credits/balance');
    return response.data;
  },

  async getLedger(): Promise<APIResponse<CreditLedgerEntry[]>> {
    const response = await api.get<APIResponse<CreditLedgerEntry[]>>('/credits/ledger');
    return response.data;
  },
};
