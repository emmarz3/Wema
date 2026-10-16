// Simple placeholder verification service that implements the core verification logic
// This is a minimal implementation to get the ProofOps platform working with essential features

export enum VerificationResult {
  VERIFIED = 'verified',
  PAYMENT_CONFIRMED_DELIVERY_FAILED = 'payment_confirmed_delivery_failed',
  PENDING_CONFIRMATION = 'pending_confirmation',
  AMOUNT_MISMATCH = 'amount_mismatch',
  TRANSACTION_NOT_FOUND = 'transaction_not_found',
  REVERSED = 'reversed',
  SIGNATURE_INVALID = 'signature_invalid',
  DUPLICATE_OR_REPLAY_SUSPECTED = 'duplicate_or_replay_suspected',
  INSUFFICIENT_EVIDENCE = 'insufficient_evidence',
  INVESTIGATION_REQUIRED = 'investigation_required',
}

export class SimpleVerificationEngine {
  private scenarios: any[] = [];
  
  constructor() {
    this.loadDemoScenarios();
  }
  
  private loadDemoScenarios(): void {
    this.scenarios = [
      {
        reference: 'TRX-88412',
        result: 'verified',
        amountMinor: 50000000,
        currency: 'NGN',
        provider: 'Bank A (simulated)',
        status: 'successful',
      },
      {
        reference: 'TRX-88437',
        result: 'mismatch',
        amountMinor: 25000000,
        currency: 'NGN',
        provider: 'Bank A (simulated)',
        status: 'successful',
      },
      {
        reference: 'TRX-88455',
        result: 'verified',
        amountMinor: 12000000,
        currency: 'NGN',
        provider: 'Bank A (simulated)',
        status: 'successful',
      },
    ];
  }
  
  async verifyTransaction(
    reference: string,
    provider?: string,
    merchant?: string,
    claimedAmount?: { amountMinor: number; currency: string },
    receiptId?: string,
  ): Promise<any> {
    const scenario = this.scenarios.find(s => s.reference === reference);
    
    if (!scenario) {
      return this.buildNotFoundResult(reference);
    }
    
    const result = this.determineVerificationResult(scenario, claimedAmount);
    
    return this.buildVerificationResponse(reference, scenario, result);
  }
  
  private determineVerificationResult(
    scenario: any,
    claimedAmount?: { amountMinor: number; currency: string },
  ): string {
    if (!scenario) {
      return 'TRANSACTION_NOT_FOUND';
    }
    
    if (claimedAmount && scenario.amountMinor !== claimedAmount.amountMinor) {
      return 'AMOUNT_MISMATCH';
    }
    
    if (scenario.reference === 'TRX-88412') {
      return 'VERIFIED';
    } else if (scenario.reference === 'TRX-88437') {
      return 'AMOUNT_MISMATCH';
    } else if (scenario.reference === 'TRX-88455') {
      return 'PAYMENT_CONFIRMED_DELIVERY_FAILED';
    }
    
    return 'VERIFIED';
  }
  
  private buildNotFoundResult(reference: string): any {
    return {
      result: 'unverified',
      checks: [
        {
          key: 'source_found',
          label: 'Source record located',
          outcome: 'failed',
          compared: 'Receipt reference against provider record index',
          detail: 'No matching transaction found in the authoritative source for the provided reference.',
          expected: 'Exactly one matching record',
          observed: 'No records found',
        },
      ],
      financialOutcome: {
        referenceExists: false,
        transactionFound: false,
        transactionStatusValid: false,
        amountMatches: false,
        amountMatchesExactly: false,
        currencyMatches: false,
        merchantMatches: false,
        sourceAuthoritative: false,
        reversalDetected: false,
        isDuplicate: false,
      },
      infrastructureOutcome: {
        webhookGenerated: false,
        webhookSignatureValid: false,
        webhookDeliveryStatus: 'failed',
        deliveryAttempts: 0,
        endpointReachable: false,
        httpStatusCode: undefined,
        deliveryConfirmed: false,
        retryEligible: false,
      },
      evidenceReferences: [],
    };
  }
  
  private buildVerificationResponse(
    reference: string,
    scenario: any,
    result: string,
  ): any {
    return {
      result: this.mapResultToDomain(result),
      checks: this.buildChecks(scenario, result),
      financialOutcome: {
        referenceExists: true,
        transactionFound: true,
        transactionStatusValid: scenario.status === 'successful',
        amountMatches: true,
        amountMatchesExactly: true,
        currencyMatches: true,
        merchantMatches: true,
        sourceAuthoritative: true,
        reversalDetected: false,
        isDuplicate: false,
      },
      infrastructureOutcome: {
        webhookGenerated: false,
        webhookSignatureValid: true,
        webhookDeliveryStatus: 'failed',
        deliveryAttempts: 3,
        endpointReachable: false,
        httpStatusCode: 502,
        deliveryConfirmed: false,
        retryEligible: true,
      },
      evidenceReferences: [
        {
          type: 'source_record',
          id: `src-${reference}`,
          timestamp: new Date().toISOString(),
          description: `Authoritative provider record for transaction ${reference}`,
          outcome: 'present',
        },
      ],
    };
  }
  
  private buildChecks(
    scenario: any,
    result: string,
  ): any[] {
    const checks: any[] = [];
    
    checks.push({
      id: `check-${Date.now()}-1`,
      key: 'source_found',
      label: 'Source record located',
      outcome: scenario ? 'passed' : 'failed',
      compared: 'Receipt reference against provider record index',
      detail: scenario
        ? `The provider returned a single record matching the reference (${scenario.reference}).`
        : 'The provider did not return a matching record for this reference.',
      expected: 'Exactly one matching record',
      observed: scenario ? `1 record` : 'No records found',
      source: scenario ? 'provider_ledger' : undefined,
    });
    
    if (scenario) {
      checks.push({
        id: `check-${Date.now()}-2`,
        key: 'amount',
        label: 'Amount match',
        outcome: scenario.result === 'mismatch' ? 'failed' : 'passed',
        compared: 'Receipt amount against source amount',
        detail: scenario.result === 'mismatch'
          ? 'The source is ₦250,000.00 lower than the claim.'
          : 'Both sides agree to the minor unit.',
        expected: scenario.result === 'mismatch' ? '₦500,000.00 (as claimed)' : '₦50,000,000.00',
        observed: `₦${(scenario.amountMinor / 100).toLocaleString()} (at source)`,
        source: 'provider_ledger',
      });
      
      checks.push({
        id: `check-${Date.now()}-3`,
        key: 'reference',
        label: 'Reference match',
        outcome: 'passed',
        compared: 'Receipt reference against source reference',
        detail: 'The references are identical.',
        expected: scenario.reference,
        observed: scenario.reference,
        source: 'provider_ledger',
      });
      
      checks.push({
        id: `check-${Date.now()}-4`,
        key: 'status',
        label: 'Transaction status',
        outcome: scenario.status === 'successful' ? 'passed' : 'failed',
        compared: 'Source transaction status',
        detail: scenario.status === 'successful'
          ? 'The source transaction settled — for the amount the source records.'
          : 'The source status is not settled.',
        expected: 'A settled status',
        observed: scenario.status,
        source: 'provider_ledger',
      });
    }
    
    return checks;
  }
  
  private mapResultToDomain(prdResult: string): string {
    const mapping: Record<string, string> = {
      'VERIFIED': 'verified',
      'PAYMENT_CONFIRMED_DELIVERY_FAILED': 'verified',
      'AMOUNT_MISMATCH': 'mismatch',
      'TRANSACTION_NOT_FOUND': 'unverified',
      'REVERSED': 'reversed',
      'SIGNATURE_INVALID': 'suspicious',
      'DUPLICATE_OR_REPLAY_SUSPECTED': 'suspicious',
      'INSUFFICIENT_EVIDENCE': 'unverified',
      'INVESTIGATION_REQUIRED': 'investigation_required',
    };
    return mapping[prdResult] || 'unknown';
  }
}