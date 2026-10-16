"""
Simulated backend handlers for ProofOps verification services.

This module implements the simulated backend handlers that integrate with the 
DeterministicVerificationEngine to provide realistic simulation of verification outcomes.
"""

import type { ApiRequest, ApiResponse } from '../types';
import { registerHandler } from './index';
import { DeterministicVerificationEngine } from './backend/verification';
import { AIInvestigator } from './backend/investigator';
import { DEMO_SCENARIOS } from '../components/marketing/demoFixtures';

const verificationEngine = new DeterministicVerificationEngine({
  providerBaseUrl: 'https://api.simulated-bank.example',
  simulated: true,
});

const aiInvestigator = new AIInvestigator({
  apiKey: process.env.OPENAI_API_KEY || 'demo-key-for-simulation',
  model: 'gpt-4o-mini',
  simulation: true,
});

interface VerifyTransactionBody {
  reference: string;
  provider?: string;
  merchant?: string;
  claimedAmountMinor?: number;
  currency?: string;
  receiptId?: string;
  idempotencyKey?: string;
}

function handleVerifyTransaction(request: ApiRequest): ApiResponse {
  try {
    const body = (request.body || {}) as VerifyTransactionBody;
    
    // Validate required fields
    if (!body.reference) {
      return {
        status: 422,
        ok: false,
        body: {
          code: 'validation_failed',
          message: 'Reference is required',
          details: { reference: 'Reference is required' },
        },
      };
    }
    
    // Start verification process using deterministic engine
    const engineResult = verificationEngine.verifyTransaction(
      body.reference,
      body.provider,
      body.merchant,
      body.claimedAmountMinor ? {
        amountMinor: body.claimedAmountMinor,
        currency: body.currency || 'NGN',
      } : undefined,
      body.receiptId,
      body.idempotencyKey,
    );
    
    // Generate AI investigation for the verification result
    const investigation = aiInvestigator.investigate(
      `verif-${Date.now()}`, // Verification ID
      engineResult,
      process.env.OPENAI_API_KEY ? 'auto' : 'template' // Use AI if configured, otherwise template
    );
    
    // Format verification response to match existing types
    const verification = {
      id: `verif-${Date.now()}`,
      reference: body.reference,
      proofId: `PV-${Math.random().toString(36).substr(2, 8).toUpperCase()}`, // Simulated proof ID
      provider: body.provider || 'Bank A (simulated)',
      merchant: body.merchant || 'Customer A',
      claimedAmount: body.claimedAmountMinor ? {
        amountMinor: body.claimedAmountMinor,
        currency: body.currency || 'NGN',
      } : undefined,
      sourceAmount: engineResult.financialOutcome.referenceExists ? {
        amountMinor: 25000000, // ₦250,000 (from demo fixtures)
        currency: 'NGN',
      } : undefined,
      transactionStatus: 'success',
      result: mapVerificationResultToDomain(engineResult.result),
      status: mapVerificationResultToStatus(engineResult.result),
      checks: engineResult.checks.map(check => ({
        id: check.id,
        key: check.key,
        label: check.label,
        outcome: mapCheckOutcomeToDomain(check.outcome),
        compared: check.compared,
        detail: check.detail,
        expected: check.expected,
        observed: check.observed,
        source: check.source,
      })),
      receipt: null, // Would be populated if receipt service implemented
      sourceRecord: engineResult.financialOutcome.referenceExists ? {
        provider: body.provider || 'Bank A (simulated)',
        sourceTransactionId: `SRC-${Math.random().toString(36).substr(2, 8).toUpperCase()}`, // Simulated source ID
        amount: engineResult.financialOutcome.amountMatchesExactly ? {
          amountMinor: 25000000,
          currency: 'NGN',
        } : { amountMinor: 0, currency: 'NGN' },
        status: 'success',
        occurredAt: new Date().toISOString(),
        found: true,
        note: 'Transaction confirmed in provider ledger',
      } : undefined,
      sourceAvailability: engineResult.infrastructureOutcome.endpointReachable ? 'available' : 'unavailable',
      reversal: 'none',
      duplicateOf: undefined,
      relatedEventIds: [],
      discrepancyId: undefined,
      incidentId: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      verifiedAt: engineResult.financialOutcome.transactionFound ? new Date().toISOString() : undefined,
      // Add AI investigation to the verification record
      investigation: {
        id: investigation.investigationId,
        subjectType: 'verification',
        subjectId: `verif-${Date.now()}`, // Verification ID
        status: investigation.status,
        generatedAt: investigation.generatedAt,
        confirmedFacts: investigation.confirmedFacts,
        possibleCauses: investigation.possibleCauses,
        nextChecks: investigation.nextChecks,
        sources: investigation.sources,
        unavailableReason: investigation.unavailableReason,
      },
    };
    
    return {
      status: 200,
      ok: true,
      body: verification,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown verification error';
    
    return {
      status: 500,
      ok: false,
      body: {
        code: 'verification_failed',
        message: 'Verification process failed',
        details: { error: errorMessage },
      },
    };
  }
}

function handleVerificationsList(request: ApiRequest): ApiResponse {
  try {
    // Parse query parameters for filtering
    const url = new URL(`http://localhost${request.path}${request.query || ''}`);
    const search = url.searchParams.get('search') || undefined;
    const provider = url.searchParams.get('provider') || undefined;
    const result = url.searchParams.get('result') || undefined;
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    
    // Get all verification scenarios from demo fixtures
    const verifications = DEMO_SCENARIOS.map((scenario, index) => {
      const verificationId = `verif-${index + 1}`;
      
      return {
        id: verificationId,
        reference: scenario.receipt.reference,
        proofId: `PV-${Math.random().toString(36).substr(2, 8).toUpperCase()}`, // Simulated
        provider: scenario.source.provider,
        merchant: scenario.receipt.merchant,
        claimedAmount: {
          amountMinor: scenario.receipt.amountMinor,
          currency: scenario.receipt.currency,
        },
        sourceAmount: {
          amountMinor: scenario.source.amountMinor,
          currency: scenario.source.currency,
        },
        transactionStatus: 'success',
        result: mapScenarioResultToDomain(scenario.outcome.result),
        status: mapScenarioResultToStatus(scenario.outcome.result),
        checks: [], // Would be populated with detailed checks
        receipt: null,
        sourceRecord: {
          provider: scenario.source.provider,
          sourceTransactionId: `SRC-${Math.random().toString(36).substr(2, 8).toUpperCase()}`, // Simulated
          amount: {
            amountMinor: scenario.source.amountMinor,
            currency: scenario.source.currency,
          },
          status: 'success',
          occurredAt: scenario.source.occurredAt,
          found: true,
        },
        sourceAvailability: 'available',
        reversal: 'none',
        duplicateOf: undefined,
        relatedEventIds: [],
        discrepancyId: undefined,
        incidentId: undefined,
        createdAt: scenario.receipt.claimedAt,
        updatedAt: scenario.receipt.claimedAt,
        verifiedAt: scenario.receipt.claimedAt,
      };
    });
    
    // Apply filters
    let filtered = verifications;
    
    if (search) {
      filtered = filtered.filter(v => 
        v.reference.toLowerCase().includes(search.toLowerCase()) ||
        v.provider.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (provider) {
      filtered = filtered.filter(v => v.provider === provider);
    }
    
    if (result) {
      filtered = filtered.filter(v => v.result === result);
    }
    
    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = filtered.slice(startIndex, endIndex);
    
    return {
      status: 200,
      ok: true,
      body: {
        items: paginated,
        total: filtered.length,
        page,
        pageSize,
      },
    };
    
  } catch (error) {
    return {
      status: 500,
      ok: false,
      body: {
        code: 'verifications_list_failed',
        message: 'Failed to retrieve verification records',
        details: { error: 'Internal server error' },
      },
    };
  }
}

function handleVerificationDetail(request: ApiRequest): ApiResponse {
  try {
    // Extract verification ID from path
    const pathParts = request.path.split('/');
    const verificationId = pathParts[pathParts.length - 1];
    
    // Find verification in demo fixtures
    const scenarioIndex = parseInt(verificationId.replace('verif-', '')) - 1;
    
    if (isNaN(scenarioIndex) || scenarioIndex < 0 || scenarioIndex >= DEMO_SCENARIOS.length) {
      return {
        status: 404,
        ok: false,
        body: {
          code: 'not_found',
          message: 'Verification not found',
          details: { verificationId },
        },
      };
    }
    
    const scenario = DEMO_SCENARIOS[scenarioIndex];
    const verification = {
      id: `verif-${scenarioIndex + 1}`,
      reference: scenario.receipt.reference,
      proofId: `PV-${Math.random().toString(36).substr(2, 8).toUpperCase()}`, // Simulated
      provider: scenario.source.provider,
      merchant: scenario.receipt.merchant,
      claimedAmount: {
        amountMinor: scenario.receipt.amountMinor,
        currency: scenario.receipt.currency,
      },
      sourceAmount: {
        amountMinor: scenario.source.amountMinor,
        currency: scenario.source.currency,
      },
      transactionStatus: 'success',
      result: mapScenarioResultToDomain(scenario.outcome.result),
      status: mapScenarioResultToStatus(scenario.outcome.result),
      checks: [], // Would be populated with detailed checks
      receipt: null,
      sourceRecord: {
        provider: scenario.source.provider,
        sourceTransactionId: `SRC-${Math.random().toString(36).substr(2, 8).toUpperCase()}`, // Simulated
        amount: {
          amountMinor: scenario.source.amountMinor,
          currency: scenario.source.currency,
        },
        status: 'success',
        occurredAt: scenario.source.occurredAt,
        found: true,
      },
      sourceAvailability: 'available',
      reversal: 'none',
      duplicateOf: undefined,
      relatedEventIds: [],
      discrepancyId: undefined,
      incidentId: undefined,
      createdAt: scenario.receipt.claimedAt,
      updatedAt: scenario.receipt.claimedAt,
      verifiedAt: scenario.receipt.claimedAt,
    };
    
    return {
      status: 200,
      ok: true,
      body: verification,
    };
    
  } catch (error) {
    return {
      status: 500,
      ok: false,
      body: {
        code: 'verification_detail_failed',
        message: 'Failed to retrieve verification details',
        details: { error: 'Internal server error' },
      },
    };
  }
}

function handleRetryVerification(request: ApiRequest): ApiResponse {
  try {
    // Extract verification ID from path
    const pathParts = request.path.split('/');
    const verificationId = pathParts[pathParts.length - 2]; // verifications/:id/retry
    
    // For simulation, just return the verification again with updated timestamp
    const scenarioIndex = parseInt(verificationId.replace('verif-', '')) - 1;
    
    if (isNaN(scenarioIndex) || scenarioIndex < 0 || scenarioIndex >= DEMO_SCENARIOS.length) {
      return {
        status: 404,
        ok: false,
        body: {
          code: 'not_found',
          message: 'Verification not found',
          details: { verificationId },
        },
      };
    }
    
    const scenario = DEMO_SCENARIOS[scenarioIndex];
    const verification = {
      id: `verif-${scenarioIndex + 1}`, // Same ID, but retry
      reference: scenario.receipt.reference,
      proofId: `PV-${Math.random().toString(36).substr(2, 8).toUpperCase()}`, // New proof ID for retry
      provider: scenario.source.provider,
      merchant: scenario.receipt.merchant,
      claimedAmount: {
        amountMinor: scenario.receipt.amountMinor,
        currency: scenario.receipt.currency,
      },
      sourceAmount: {
        amountMinor: scenario.source.amountMinor,
        currency: scenario.source.currency,
      },
      transactionStatus: 'success',
      result: mapScenarioResultToDomain(scenario.outcome.result),
      status: mapScenarioResultToStatus(scenario.outcome.result),
      checks: [], // Would be populated with detailed checks
      receipt: null,
      sourceRecord: {
        provider: scenario.source.provider,
        sourceTransactionId: `SRC-${Math.random().toString(36).substr(2, 8).toUpperCase()}`, // New source ID for retry
        amount: {
          amountMinor: scenario.source.amountMinor,
          currency: scenario.source.currency,
        },
        status: 'success',
        occurredAt: scenario.source.occurredAt,
        found: true,
      },
      sourceAvailability: 'available',
      reversal: 'none',
      duplicateOf: undefined,
      relatedEventIds: [],
      discrepancyId: undefined,
      incidentId: undefined,
      createdAt: scenario.receipt.claimedAt,
      updatedAt: new Date().toISOString(), // Updated timestamp for retry
      verifiedAt: scenario.receipt.claimedAt,
    };
    
    return {
      status: 200,
      ok: true,
      body: verification,
    };
    
  } catch (error) {
    return {
      status: 500,
      ok: false,
      body: {
        code: 'retry_verification_failed',
        message: 'Failed to retry verification',
        details: { error: 'Internal server error' },
      },
    };
  }
}

// Helper functions to map between verification result types
function mapVerificationResultToDomain(prdResult: string): string {
  const mapping: Record<string, string> = {
    'verified': 'verified',
    'payment_confirmed_delivery_failed': 'verified',
    'mismatch': 'mismatch',
    'amount_mismatch': 'mismatch',
    'transaction_not_found': 'unverified',
    'reversed': 'reversed',
    'signature_invalid': 'suspicious',
    'duplicate_or_replay_suspected': 'suspicious',
    'insufficient_evidence': 'unverified',
    'investigation_required': 'investigation_required',
  };
  return mapping[prdResult] || 'unknown';
}

function mapVerificationResultToStatus(prdResult: string): string {
  const mapping: Record<string, string> = {
    'verified': 'success',
    'payment_confirmed_delivery_failed': 'success',
    'mismatch': 'failed',
    'amount_mismatch': 'failed',
    'transaction_not_found': 'failed',
    'reversed': 'reversed',
    'signature_invalid': 'failed',
    'duplicate_or_replay_suspected': 'failed',
    'insufficient_evidence': 'pending',
    'investigation_required': 'investigating',
  };
  return mapping[prdResult] || 'pending';
}

function mapCheckOutcomeToDomain(prdOutcome: string): string {
  const mapping: Record<string, string> = {
    'passed': 'passed',
    'failed': 'failed',
    'unavailable': 'unavailable',
    'pending': 'pending',
  };
  return mapping[prdOutcome] || 'unavailable';
}

function mapScenarioResultToDomain(scenarioResult: string): string {
  const mapping: Record<string, string> = {
    'verified': 'verified',
    'mismatch': 'mismatch',
    'verified': 'verified',
  };
  return mapping[scenarioResult] || 'unknown';
}

function mapScenarioResultToStatus(scenarioResult: string): string {
  const mapping: Record<string, string> = {
    'verified': 'success',
    'mismatch': 'failed',
    'verified': 'success',
  };
  return mapping[scenarioResult] || 'pending';
}

// Export handlers for registration
export function registerVerificationHandlers(): void {
  registerHandler('POST', '/verifications', handleVerifyTransaction);
  registerHandler('GET', '/verifications', handleVerificationsList);
  registerHandler('GET', '/verifications/:id', handleVerificationDetail);
  registerHandler('POST', '/verifications/:id/retry', handleRetryVerification);
}
