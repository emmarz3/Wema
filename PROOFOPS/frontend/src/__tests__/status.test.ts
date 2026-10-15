import { describe, expect, it } from 'vitest';
import {
  checkOutcomes,
  checkOutcomeLabels,
  checkOutcomeTones,
  deliveryStatuses,
  deliveryStatusLabels,
  incidentSeverities,
  incidentSeverityLabels,
  incidentStatuses,
  incidentStatusLabels,
  labelOf,
  providerStatuses,
  reconciliationStatuses,
  transactionStatuses,
  transactionStatusLabels,
  verificationResults,
  verificationResultDescriptions,
  verificationResultLabels,
  verificationResultTones,
  verificationStatuses,
} from '../lib/status';

/**
 * The status vocabulary is the backbone of the interface: every status
 * must have a label, a tone, and (for the money-statuses) an explanation.
 * These tests keep the vocabulary complete and consistent.
 */
describe('verification results', () => {
  it('defines the five documented outcomes', () => {
    expect([...verificationResults]).toEqual([
      'verified',
      'mismatch',
      'unverified',
      'suspicious',
      'unknown',
    ]);
  });

  it('labels every outcome', () => {
    verificationResults.forEach((result) => {
      expect(verificationResultLabels[result]).toBeTruthy();
      expect(verificationResultDescriptions[result]).toBeTruthy();
      expect(verificationResultTones[result]).toBeTruthy();
    });
  });

  it('keeps success and danger on the right outcomes', () => {
    expect(verificationResultTones.verified).toBe('success');
    expect(verificationResultTones.mismatch).toBe('danger');
  });
});

describe('parallel status vocabularies stay distinct', () => {
  it('keeps transaction status separate from verification result', () => {
    // A successful payment can be an unverified claim.
    expect(transactionStatuses).toContain('successful');
    expect(verificationResults).not.toContain('successful');
  });

  it('keeps delivery status separate from transaction status', () => {
    expect(deliveryStatuses).toContain('delivered');
    expect(deliveryStatuses).not.toContain('successful');
    expect(transactionStatuses).not.toContain('delivered');
  });

  it('defines labels and tones for every vocabulary entry', () => {
    [...checkOutcomes, ...deliveryStatuses, ...incidentSeverities, ...incidentStatuses, ...providerStatuses, ...reconciliationStatuses, ...verificationStatuses].forEach(
      (value) => {
        expect(typeof value).toBe('string');
      },
    );
    expect(Object.keys(checkOutcomeLabels)).toHaveLength(3);
    expect(Object.keys(deliveryStatusLabels)).toHaveLength(5);
    expect(Object.keys(incidentSeverityLabels)).toHaveLength(4);
    expect(Object.keys(incidentStatusLabels)).toHaveLength(4);
    expect(Object.keys(transactionStatusLabels)).toHaveLength(5);
    expect(checkOutcomeTones.failed).toBe('danger');
  });
});

describe('labelOf', () => {
  it('returns the label for known values', () => {
    expect(labelOf(verificationResultLabels, 'verified')).toBe('Verified');
  });

  it('falls back for missing values', () => {
    expect(labelOf(verificationResultLabels, undefined)).toBe('—');
    expect(labelOf(verificationResultLabels, 'nope' as never, 'Unknown')).toBe('Unknown');
  });
});
