"""
Simulated backend handlers for ProofOps receipt services.

This module implements the simulated backend handlers for receipt upload and OCR extraction,
completing the receipt workflow as specified in the ProofOps PRD.
"""

import type { ApiRequest, ApiResponse } from '../types';
import { registerHandler } from './index';

interface UploadReceiptBody {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  reference: string;
}

function handleUploadReceipt(request: ApiRequest): ApiResponse {
  try {
    const body = (request.body || {}) as UploadReceiptBody;
    
    // Validate required fields
    if (!body.fileName || !body.mimeType || !body.sizeBytes || !body.reference) {
      return {
        status: 422,
        ok: false,
        body: {
          code: 'validation_failed',
          message: 'Missing required fields',
          details: {
            fileName: !body.fileName ? 'File name is required' : undefined,
            mimeType: !body.mimeType ? 'MIME type is required' : undefined,
            sizeBytes: !body.sizeBytes ? 'File size is required' : undefined,
            reference: !body.reference ? 'Reference is required' : undefined,
          },
        },
      };
    }
    
    // Generate receipt ID
    const receiptId = `rcpt-${Date.now()}`;
    
    // Simulate OCR extraction based on file type and reference
    const claims = simulateOCRExtraction(body.fileName, body.reference, body.mimeType);
    
    // Determine status based on file size and type
    const status = determineReceiptStatus(body.mimeType, body.sizeBytes);
    
    const receipt = {
      id: receiptId,
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      uploadedAt: new Date().toISOString(),
      status,
      claims,
      previewUrl: `https://preview.proofops.test/receipts/${receiptId}/preview`,
      previewExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      unavailableReason: status === 'unavailable' ? 'OCR service temporarily unavailable' : undefined,
    };
    
    return {
      status: 200,
      ok: true,
      body: receipt,
    };
    
  } catch (error) {
    return {
      status: 500,
      ok: false,
      body: {
        code: 'receipt_upload_failed',
        message: 'Failed to upload receipt',
        details: { error: 'Internal server error' },
      },
    };
  }
}

function handleReceiptDetail(request: ApiRequest): ApiResponse {
  try {
    // Extract receipt ID from path
    const pathParts = request.path.split('/');
    const receiptId = pathParts[pathParts.length - 1];
    
    // Simulate receipt data
    const receipt = simulateReceiptById(receiptId);
    
    if (!receipt) {
      return {
        status: 404,
        ok: false,
        body: {
          code: 'not_found',
          message: 'Receipt not found',
          details: { receiptId },
        },
      };
    }
    
    return {
      status: 200,
      ok: true,
      body: receipt,
    };
    
  } catch (error) {
    return {
      status: 500,
      ok: false,
      body: {
        code: 'receipt_detail_failed',
        message: 'Failed to retrieve receipt details',
        details: { error: 'Internal server error' },
      },
    };
  }
}

function handleReceiptPreview(request: ApiRequest): ApiResponse {
  try {
    // Extract receipt ID from path
    const pathParts = request.path.split('/');
    const receiptId = pathParts[pathParts.length - 2]; // /receipts/:id/preview
    
    // Simulate preview URL generation
    const previewUrl = `https://preview.proofops.test/receipts/${receiptId}/download?token=${Math.random().toString(36).substr(2, 16)}`;
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour
    
    return {
      status: 200,
      ok: true,
      body: {
        url: previewUrl,
        expiresAt,
      },
    };
    
  } catch (error) {
    return {
      status: 500,
      ok: false,
      body: {
        code: 'receipt_preview_failed',
        message: 'Failed to generate receipt preview',
        details: { error: 'Internal server error' },
      },
    };
  }
}

function handleReviewReceipt(request: ApiRequest): ApiResponse {
  try {
    // Extract receipt ID from path
    const pathParts = request.path.split('/');
    const receiptId = pathParts[pathParts.length - 2]; // /receipts/:id/review
    
    const body = (request.body || {});
    
    if (!body.decisions || !Array.isArray(body.decisions)) {
      return {
        status: 422,
        ok: false,
        body: {
          code: 'validation_failed',
          message: 'Decisions field is required and must be an array',
          details: { decisions: 'Decisions must be an array of field decisions' },
        },
      };
    }
    
    // Simulate review processing
    const reviewedReceipt = simulateReceiptReview(receiptId, body);
    
    return {
      status: 200,
      ok: true,
      body: reviewedReceipt,
    };
    
  } catch (error) {
    return {
      status: 500,
      ok: false,
      body: {
        code: 'receipt_review_failed',
        message: 'Failed to process receipt review',
        details: { error: 'Internal server error' },
      },
    };
  }
}

function simulateOCRExtraction(fileName: string, reference: string, mimeType: string): any[] {
  // Simulate OCR extraction based on file type and reference
  const extractedClaims = [];
  
  // For simulation, extract different fields based on file type
  if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
    // Simulate different types of receipts
    if (reference === 'TRX-88412') {
      // Simulate successful extraction for verified transaction
      extractedClaims.push(
        {
          field: 'amount',
          value: '50000000', // ₦500,000
          confidence: 0.98,
        },
        {
          field: 'currency',
          value: 'NGN',
          confidence: 1.0,
        },
        {
          field: 'merchant',
          value: 'Northwind Trading',
          confidence: 0.95,
        },
        {
          field: 'reference',
          value: 'TRX-88412',
          confidence: 0.99,
        },
        {
          field: 'paid_at',
          value: '2026-10-12T16:04:22Z',
          confidence: 0.96,
        },
      );
    } else if (reference === 'TRX-88437') {
      // Simulate mismatch extraction
      extractedClaims.push(
        {
          field: 'amount',
          value: '50000000', // ₦500,000 (claimed)
          confidence: 0.92,
        },
        {
          field: 'currency',
          value: 'NGN',
          confidence: 1.0,
        },
        {
          field: 'merchant',
          value: 'Northwind Trading',
n        },
        {
          field: 'reference',
          value: 'TRX-88437',
          confidence: 0.97,
        },
      );
    } else if (reference === 'TRX-88455') {
      // Simulate successful extraction for delivery-failed scenario
      extractedClaims.push(
        {
          field: 'amount',
          value: '12000000', // ₦120,000
          confidence: 0.94,
        },
        {
          field: 'currency',
          value: 'NGN',
          confidence: 1.0,
        },
        {
          field: 'merchant',
          value: 'Northwind Trading',
          confidence: 0.93,
        },
        {
          field: 'reference',
          value: 'TRX-88455',
          confidence: 0.98,
        },
      );
    }
  }
  
  return extractedClaims;
}

function simulateReceiptById(receiptId: string): any {
  // Extract timestamp from receipt ID
  const timestamp = receiptId.replace('rcpt-', '');
  
  // Simulate different receipt scenarios based on ID
  if (receiptId.includes('88412')) {
    return {
      id: receiptId,
      fileName: `receipt-${receiptId}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 245760, // 240KB
      uploadedAt: new Date(Date.now() - 300000).toString(), // 5 minutes ago
      status: 'extracted',
      claims: simulateOCRExtraction(`receipt-${receiptId}.jpg`, 'TRX-88412', 'image/jpeg'),
      previewUrl: `https://preview.proofops.test/receipts/${receiptId}/preview`,
      previewExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  } else if (receiptId.includes('88437')) {
    return {
      id: receiptId,
      fileName: `receipt-${receiptId}.png`,
      mimeType: 'image/png',
      sizeBytes: 512000, // 500KB
      uploadedAt: new Date(Date.now() - 600000).toString(), // 10 minutes ago
      status: 'extracted',
      claims: simulateOCRExtraction(`receipt-${receiptId}.png`, 'TRX-88437', 'image/png'),
      previewUrl: `https://preview.proofops.test/receipts/${receiptId}/preview`,
      previewExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  } else if (receiptId.includes('88455')) {
    return {
      id: receiptId,
      fileName: `receipt-${receiptId}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 198400, // 194KB
      uploadedAt: new Date(Date.now() - 900000).toString(), // 15 minutes ago
      status: 'extracted',
      claims: simulateOCRExtraction(`receipt-${receiptId}.jpg`, 'TRX-88455', 'image/jpeg'),
      previewUrl: `https://preview.proofops.test/receipts/${receiptId}/preview`,
      previewExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  } else {
    return {
      id: receiptId,
      fileName: `receipt-${receiptId}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 1024000, // 1MB
      uploadedAt: new Date(Date.now() - 1200000).toString(), // 20 minutes ago
      status: 'unavailable',
      claims: [],
      unavailableReason: 'OCR service temporarily unavailable for PDF files',
    };
  }
}

function determineReceiptStatus(mimeType: string, sizeBytes: number): string {
  // Simulate receipt processing status based on file type and size
  if (mimeType.startsWith('image/')) {
    if (sizeBytes < 1024 * 1024) { // Less than 1MB
      return 'extracted';
    } else {
      return 'extracting';
    }
  } else if (mimeType === 'application/pdf') {
    return 'unavailable'; // Simulate PDF not supported in this demo
  } else {
    return 'unavailable';
  }
}

function simulateReceiptReview(receiptId: string, body: any): any {
  // Simulate receipt review based on user decisions
  const receipt = simulateReceiptById(receiptId);
  
  // Update claims based on user decisions
  if (body.decisions) {
    receipt.claims = receipt.claims.map((claim: any) => {
      const userDecision = body.decisions.find((d: any) => d.field === claim.field);
      if (userDecision) {
        return {
          ...claim,
          value: userDecision.value,
          // In real implementation, this would also update confidence based on user decision
        };
      }
      return claim;
    });
  }
  
  return receipt;
}

// Export handlers for registration
export function registerReceiptHandlers(): void {
  registerHandler('POST', '/receipts', handleUploadReceipt);
  registerHandler('GET', '/receipts/:id', handleReceiptDetail);
  registerHandler('GET', '/receipts/:id/preview', handleReceiptPreview);
  registerHandler('POST', '/receipts/:id/review', handleReviewReceipt);
}
