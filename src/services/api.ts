import {
  License,
  Customer,
  Payment,
  LicenseAssignment,
  AuditLog,
  DashboardStats,
  ImportPreviewResult,
  AssignLicensePayload,
  ExtendLicensePayload,
  CancelLicensePayload,
  CustomerDetailRecord,
  AppSettings
} from '../types';

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      getVersion: () => Promise<string>;
      copyClipboard: (text: string) => Promise<boolean>;
      openExternal: (url: string) => Promise<boolean>;
      openFileDialog: (options?: any) => Promise<any>;
      saveFileDialog: (options?: any) => Promise<any>;
    };
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (window.electronAPI?.copyClipboard) {
    try {
      return await window.electronAPI.copyClipboard(text);
    } catch {
      // fallback
    }
  }

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }
  return data as T;
}

export const api = {
  // Auth
  async getAuthStatus(): Promise<{ hasPin: boolean; companyName: string; defaultDurationDays: number }> {
    return request('/api/auth/status');
  },
  async setupPin(pin: string): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/setup-pin', {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
  },
  async verifyPin(pin: string): Promise<{ success: boolean; isDefault?: boolean }> {
    return request('/api/auth/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return request('/api/dashboard/stats');
  },

  // Licenses
  async getLicenses(params?: { status?: string; search?: string; limit?: number; offset?: number }): Promise<License[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    return request(`/api/licenses?${query.toString()}`);
  },
  async previewImport(content: string, format?: string): Promise<ImportPreviewResult> {
    return request('/api/licenses/preview-import', {
      method: 'POST',
      body: JSON.stringify({ content, format })
    });
  },
  async importLicenses(keys: string[], notes?: string): Promise<{ success: boolean; importedCount: number; message: string }> {
    return request('/api/licenses/import', {
      method: 'POST',
      body: JSON.stringify({ keys, notes })
    });
  },
  async previewCandidate(): Promise<{ available: boolean; licenseId: number; licenseKey: string; importedAt: string }> {
    return request('/api/licenses/preview-candidate', {
      method: 'POST'
    });
  },
  async assignLicense(payload: AssignLicensePayload): Promise<{
    success: boolean;
    message: string;
    license: { id: number; licenseKey: string; status: string; startDate: string; expiryDate: string; durationDays: number };
    customer: { name: string; telegramUsername: string; phone: string };
    clipboardSummary: string;
  }> {
    return request('/api/licenses/assign', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async extendLicense(payload: ExtendLicensePayload): Promise<{ success: boolean; newExpiryDate: string; message: string }> {
    return request('/api/licenses/extend', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async cancelLicense(payload: CancelLicensePayload): Promise<{ success: boolean; message: string }> {
    return request('/api/licenses/cancel', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Proof Upload
  async uploadProof(file: File): Promise<{ proofPath: string; filename: string; originalName: string; mimeType: string }> {
    const formData = new FormData();
    formData.append('proof', file);
    const res = await fetch('/api/upload-proof', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload proof');
    return data;
  },

  // Customers
  async getCustomers(params?: { search?: string; limit?: number; offset?: number }): Promise<Customer[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    return request(`/api/customers?${query.toString()}`);
  },
  async getCustomerDetail(id: number): Promise<CustomerDetailRecord> {
    return request(`/api/customers/${id}`);
  },
  async updateCustomer(id: number, data: Partial<Customer>): Promise<{ success: boolean; message: string }> {
    return request(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Payments
  async getPayments(params?: { status?: string; search?: string }): Promise<Payment[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    return request(`/api/payments?${query.toString()}`);
  },
  async verifyPayment(id: number): Promise<{ success: boolean; message: string }> {
    return request(`/api/payments/${id}/verify`, { method: 'PUT' });
  },
  async rejectPayment(id: number, reason?: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/payments/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    });
  },

  // Audit Logs
  async getAuditLogs(params?: { action?: string; search?: string; limit?: number; offset?: number }): Promise<AuditLog[]> {
    const query = new URLSearchParams();
    if (params?.action && params.action !== 'ALL') query.append('action', params.action);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    return request(`/api/audit-logs?${query.toString()}`);
  },

  // Reports
  async getReports(): Promise<{
    dailyAssignments: { date: string; count: number }[];
    inventoryBreakdown: { status: string; count: number }[];
    durationBreakdown: { duration_days: number; count: number }[];
  }> {
    return request('/api/reports');
  },

  // Settings
  async getSettings(): Promise<Record<string, string>> {
    return request('/api/settings');
  },
  async updateSettings(settings: Partial<AppSettings> | Record<string, any>): Promise<{ success: boolean; message: string }> {
    return request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  },
  async setPin(newPin: string, currentPin?: string): Promise<{ success: boolean; message: string }> {
    return request('/api/settings/pin', {
      method: 'POST',
      body: JSON.stringify({ newPin, currentPin })
    });
  },

  // Demo & Clear
  async loadDemo(): Promise<{ success: boolean; count: number; message: string }> {
    return request('/api/demo/load', { method: 'POST' });
  },
  async seedDemo(): Promise<{ success: boolean; message: string }> {
    return request('/api/demo/seed', { method: 'POST' });
  },
  async clearDemo(): Promise<{ success: boolean; message: string }> {
    return request('/api/demo/clear', { method: 'POST' });
  },
  async clearAllData(): Promise<{ success: boolean; message: string }> {
    return request('/api/data/clear', { method: 'POST' });
  },

  // Backup & Restore
  getBackupDownloadUrl(): string {
    return '/api/backup/download';
  },
  async restoreBackup(file: File): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('backupFile', file);
    const res = await fetch('/api/backup/restore', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to restore backup');
    return data;
  }
};
