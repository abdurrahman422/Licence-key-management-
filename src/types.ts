export type LicenseStatus = 'AVAILABLE' | 'RESERVED' | 'ASSIGNED' | 'EXPIRED' | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface License {
  id: number;
  licenseKey: string;
  status: LicenseStatus;
  importedAt: string;
  assignedAt: string | null;
  customerId: number | null;
  customerName?: string | null;
  telegramUsername?: string | null;
  phone?: string | null;
  startDate: string | null;
  expiryDate: string | null;
  durationDays: number | null;
  notes: string | null;
  isDemo?: boolean;
}

export interface Customer {
  id: number;
  name: string;
  telegramUsername: string;
  telegramUserId?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  paymentStatus?: PaymentStatus | null;
  paymentProofPath?: string | null;
  paymentProofId?: number | null;
  activeLicenseKey?: string | null;
  activeLicenseExpiry?: string | null;
  activeLicenseStatus?: LicenseStatus | null;
  isDemo?: boolean;
}

export interface Payment {
  id: number;
  customerId: number;
  customerName?: string;
  telegramUsername?: string;
  phone?: string;
  proofPath: string;
  proofOriginalName?: string;
  proofMimeType?: string;
  status: PaymentStatus;
  amount?: number;
  notes?: string;
  createdAt: string;
  verifiedAt?: string | null;
}

export interface LicenseAssignment {
  id: number;
  licenseId: number;
  licenseKey: string;
  customerId: number;
  customerName: string;
  telegramUsername?: string;
  startDate: string;
  expiryDate: string;
  durationDays: number;
  assignedAt: string;
  notes?: string;
}

export interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId?: number | null;
  description: string;
  createdAt: string;
}

export interface AppSettings {
  isConfigured: boolean;
  hasPin: boolean;
  defaultDurationDays: number;
  dateFormat: string;
  theme: 'dark' | 'light' | 'system';
  companyName: string;
  backupLocation?: string;
}

export interface DashboardStats {
  totalLicenses: number;
  availableLicenses: number;
  assignedLicenses: number;
  expiredLicenses: number;
  cancelledLicenses: number;
  totalCustomers: number;
  todayAssignments: number;
  expiringToday: number;
  expiringIn3Days: number;
  expiringIn7Days: number;
  verifiedPaymentsCount: number;
  pendingPaymentsCount: number;
}

export interface ImportPreviewResult {
  totalFound: number;
  newKeys: number;
  duplicateKeys: number;
  invalidKeys: number;
  newKeyList: string[];
  duplicateKeyList: string[];
}

export interface AssignLicensePayload {
  customerName: string;
  telegramUsername: string;
  phone: string;
  telegramUserId?: string;
  email?: string;
  address?: string;
  customerNotes?: string;
  paymentProofPath: string;
  paymentProofOriginalName?: string;
  paymentProofMimeType?: string;
  paymentAmount?: number;
  paymentNotes?: string;
  durationDays: number;
  customStartDate?: string;
}

export interface ExtendLicensePayload {
  licenseId: number;
  additionalDays: number;
  notes?: string;
}

export interface CancelLicensePayload {
  licenseId: number;
  reason: string;
}

export interface CustomerDetailRecord {
  customer: Customer;
  currentLicense: License | null;
  payments: Payment[];
  assignments: LicenseAssignment[];
  auditLogs: AuditLog[];
}
