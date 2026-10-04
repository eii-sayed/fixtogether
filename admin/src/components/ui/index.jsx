import React from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' };
  return <Loader2 className={`animate-spin text-primary-500 ${sizes[size]} ${className}`} />;
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Spinner size="xl" />
        <p className="mt-4 text-sm text-gray-400">Loading command center...</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-16 px-6 card border-dashed border-gray-800">
      {Icon && (
        <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-gray-500" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="text-center py-16 px-6 card border-danger-900/50 bg-danger-950/20">
      <div className="w-16 h-16 bg-danger-950 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-danger-800/50">
        <span className="text-2xl">⚠️</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Command Execution Error</h3>
      <p className="text-sm text-danger-300 mb-6">{error?.message || 'An unexpected error occurred.'}</p>
      {onRetry && <button onClick={onRetry} className="btn-primary">Retry</button>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, trend, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-950/80 text-primary-400 border border-primary-800/50',
    secondary: 'bg-secondary-950/80 text-secondary-400 border border-secondary-800/50',
    warning: 'bg-amber-950/80 text-amber-400 border border-amber-800/50',
    danger: 'bg-rose-950/80 text-rose-400 border border-rose-800/50',
    purple: 'bg-purple-950/80 text-purple-400 border border-purple-800/50',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-white mt-1.5">{value}</p>
          {trend && <p className={`text-xs mt-1 font-medium ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</p>}
        </div>
        {Icon && (
          <div className={`w-12 h-12 ${colors[color]} rounded-xl flex items-center justify-center shadow-xs`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const statusConfig = {
    active: { label: 'Active', className: 'badge-green' },
    pending: { label: 'Pending', className: 'badge-yellow' },
    approved: { label: 'Approved', className: 'badge-green' },
    verified: { label: 'Verified', className: 'badge-green' },
    suspended: { label: 'Suspended', className: 'badge-red' },
    rejected: { label: 'Rejected', className: 'badge-red' },
    open: { label: 'Open', className: 'badge-yellow' },
    resolved: { label: 'Resolved', className: 'badge-green' },
    completed: { label: 'Completed', className: 'badge-green' },
    disputed: { label: 'Disputed', className: 'badge-red' },
    under_review: { label: 'Under Review', className: 'badge-purple' },
  };

  const config = statusConfig[status] || { label: status?.replace(/_/g, ' ') || 'Unknown', className: 'badge-gray' };
  return <span className={config.className}>{config.label}</span>;
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-gray-100 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

export function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-6 px-1">
      <p className="text-xs text-gray-400">
        Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
      </p>
      <div className="flex gap-2">
        <button disabled={!pagination.hasPreviousPage} onClick={() => onPageChange(pagination.page - 1)}
          className="btn-outline btn-sm">Previous</button>
        <button disabled={!pagination.hasNextPage} onClick={() => onPageChange(pagination.page + 1)}
          className="btn-outline btn-sm">Next</button>
      </div>
    </div>
  );
}
