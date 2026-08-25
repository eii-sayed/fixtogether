import React from 'react';
import { Info } from 'lucide-react';

/**
 * PaymentDisclosureBanner
 * Communicates transparent payment policy to users across quotations, jobs, and invoices.
 */
export default function PaymentDisclosureBanner({ className = '' }) {
  return (
    <div
      className={`p-3.5 bg-blue-50/80 rounded-xl border border-blue-200/90 text-xs text-blue-900 flex items-start gap-2.5 shadow-xs ${className}`}
    >
      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
      <div>
        <strong className="font-semibold text-blue-950">Payment Arrangement Notice:</strong>
        <p className="text-blue-800 mt-0.5 leading-relaxed">
          Payment is arranged directly between the owner and technician upon inspection or completion. FixTogether does not currently process, escrow, or hold funds. Cost figures are recorded for transparency, warranty tracking, and dispute reference.
        </p>
      </div>
    </div>
  );
}
