import crypto from 'crypto';

// VFD API Configuration
const VFD_CONFIG = {
  BASE_URL: process.env.VFD_BASE_URL || 'https://api-devapps.vfdbank.systems/vtech-wallet/api/v2/wallet2',
  ACCESS_TOKEN: process.env.VFD_ACCESS_TOKEN,
  WALLET_NAME: process.env.VFD_WALLET_NAME || 'RestaurantWallet',
};

// VFD API Response Types
export interface VFDResponse {
  status: string;
  message: string;
  data?: any;
}

export interface CorporateAccountResponse {
  status: string;
  message: string;
  data?: {
    accountNo: string;
    accountName: string;
  };
}

export interface TransferResponse {
  status: string;
  message: string;
  data?: {
    txnId: string;
    sessionId?: string;
    reference: string;
  };
}

export interface WebhookPayload {
  reference: string;
  amount: string;
  account_number: string;
  originator_account_number: string;
  originator_account_name: string;
  originator_bank: string;
  originator_narration: string;
  timestamp: string;
  transaction_channel: string;
  session_id: string;
  initialCreditRequest?: boolean;
}

// VFD API Class
export class VFDAPI {
  private static generateSignature(fromAccount: string, toAccount: string): string {
    const concatenated = fromAccount + toAccount;
    return crypto.createHash('sha512').update(concatenated).digest('hex');
  }

  private static async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any,
    queryParams?: Record<string, string>
  ): Promise<VFDResponse> {
    const url = new URL(endpoint, VFD_CONFIG.BASE_URL);
    
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'AccessToken': VFD_CONFIG.ACCESS_TOKEN!,
    };

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (body && method === 'POST') {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url.toString(), requestOptions);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`VFD API Error: ${response.status} - ${data.message || 'Unknown error'}`);
      }
      
      return data;
    } catch (error) {
      console.error('VFD API Request failed:', error);
      throw error;
    }
  }

  // Corporate Account Creation
  static async createCorporateAccount(
    rcNumber: string,
    companyName: string,
    incorporationDate: string,
    directorBVN: string
  ): Promise<CorporateAccountResponse> {
    const payload = {
      rcNumber,
      companyName,
      incorporationDate,
      bvn: directorBVN,
    };

    return this.makeRequest('/corporateclient/create', 'POST', payload) as Promise<CorporateAccountResponse>;
  }

  // BVN Consent Check
  static async checkBVNConsent(bvn: string, type: string = '02', reference?: string): Promise<VFDResponse> {
    const queryParams: Record<string, string> = {
      bvn,
      type,
    };

    if (reference) {
      queryParams.reference = reference;
    }

    return this.makeRequest('/bvn-consent', 'GET', undefined, queryParams);
  }

  // Account Enquiry
  static async getAccountDetails(accountNumber?: string): Promise<VFDResponse> {
    const queryParams = accountNumber ? { accountNumber } : {};
    return this.makeRequest('/account/enquiry', 'GET', undefined, queryParams);
  }

  // Bank List
  static async getBankList(): Promise<VFDResponse> {
    return this.makeRequest('/bank', 'GET');
  }

  // Transfer Recipient Details
  static async getTransferRecipient(
    accountNo: string,
    bank: string,
    transferType: string
  ): Promise<VFDResponse> {
    const queryParams = {
      accountNo,
      bank,
      transfer_type: transferType,
    };

    return this.makeRequest('/transfer/recipient', 'GET', undefined, queryParams);
  }

  // Initiate Transfer
  static async initiateTransfer(transferData: {
    fromAccount: string;
    fromClientId: string;
    fromClient: string;
    fromSavingsId: string;
    fromBvn?: string;
    toClientId: string;
    toClient: string;
    toSavingsId: string;
    toSession?: string;
    toBvn?: string;
    toAccount: string;
    toBank: string;
    amount: string;
    remark: string;
    transferType: 'intra' | 'inter';
    reference: string;
    uniqueSenderAccountId?: string;
  }): Promise<TransferResponse> {
    const signature = this.generateSignature(transferData.fromAccount, transferData.toAccount);
    
    const payload = {
      ...transferData,
      signature,
    };

    return this.makeRequest('/transfer', 'POST', payload) as Promise<TransferResponse>;
  }

  // Transaction Status Query
  static async getTransactionStatus(reference?: string, sessionId?: string): Promise<VFDResponse> {
    const queryParams: Record<string, string> = {};
    
    if (reference) {
      queryParams.reference = reference;
    } else if (sessionId) {
      queryParams.sessionId = sessionId;
    } else {
      throw new Error('Either reference or sessionId must be provided');
    }

    return this.makeRequest('/transactions', 'GET', undefined, queryParams);
  }
}

// Utility Functions
export const VFDUtils = {
  generateReference: (prefix: string = VFD_CONFIG.WALLET_NAME) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}-${timestamp}-${random}`;
  },

  formatAmount: (amount: number): string => {
    return (amount * 100).toString(); // Convert to kobo
  },

  parseAmount: (amount: string): number => {
    return parseFloat(amount) / 100; // Convert from kobo to naira
  },

  validateBVN: (bvn: string): boolean => {
    return /^\d{11}$/.test(bvn);
  },

  validateRCNumber: (rcNumber: string): boolean => {
    return /^RC-\d+$/.test(rcNumber);
  },

  calculateServiceCharge: (amount: number): number => {
    return Math.round(amount * 0.025); // 2.5% service charge
  },
}; 