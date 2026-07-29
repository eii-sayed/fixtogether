import { Loader2 } from 'lucide-react';

export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' };
  return <Loader2 className={`animate-spin text-primary-600 ${sizes[size]} ${className}`} />;
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Spinner size="xl" />
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-16 px-6">
      {Icon && (
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-16 h-16 bg-danger-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">⚠️</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
      <p className="text-sm text-gray-500 mb-6">{error?.message || 'An unexpected error occurred.'}</p>
      {onRetry && <button onClick={onRetry} className="btn-primary">Try again</button>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, trend, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    secondary: 'bg-secondary-50 text-secondary-600',
    warning: 'bg-warning-50 text-warning-600',
    danger: 'bg-danger-50 text-danger-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="card card-body">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</p>}
        </div>
        {Icon && (
          <div className={`w-12 h-12 ${colors[color]} rounded-xl flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const statusConfig = {
    draft: { label: 'Draft', className: 'badge-gray' },
    published: { label: 'Published', className: 'badge-blue' },
    awaiting_ai_analysis: { label: 'Analyzing', className: 'badge-purple' },
    awaiting_owner_review: { label: 'Review AI', className: 'badge-yellow' },
    matching_technicians: { label: 'Matching', className: 'badge-blue' },
    awaiting_quotations: { label: 'Awaiting Quotes', className: 'badge-yellow' },
    quotations_received: { label: 'Quotes Received', className: 'badge-blue' },
    quotation_accepted: { label: 'Accepted', className: 'badge-green' },
    appointment_scheduled: { label: 'Scheduled', className: 'badge-blue' },
    under_inspection: { label: 'Inspecting', className: 'badge-purple' },
    repair_in_progress: { label: 'In Progress', className: 'badge-yellow' },
    waiting_for_parts: { label: 'Waiting Parts', className: 'badge-yellow' },
    quality_check: { label: 'Quality Check', className: 'badge-purple' },
    ready_for_collection: { label: 'Ready', className: 'badge-green' },
    completed: { label: 'Completed', className: 'badge-green' },
    cancelled: { label: 'Cancelled', className: 'badge-red' },
    disputed: { label: 'Disputed', className: 'badge-red' },
    repair_unsuccessful: { label: 'Unsuccessful', className: 'badge-red' },
    // Quotation statuses
    submitted: { label: 'Submitted', className: 'badge-blue' },
    accepted: { label: 'Accepted', className: 'badge-green' },
    rejected: { label: 'Rejected', className: 'badge-red' },
    withdrawn: { label: 'Withdrawn', className: 'badge-gray' },
    // Repair Job
    pending_inspection: { label: 'Pending Inspection', className: 'badge-yellow' },
    inspecting: { label: 'Inspecting', className: 'badge-purple' },
    in_progress: { label: 'In Progress', className: 'badge-yellow' },
    // General
    active: { label: 'Active', className: 'badge-green' },
    pending: { label: 'Pending', className: 'badge-yellow' },
    approved: { label: 'Approved', className: 'badge-green' },
    verified: { label: 'Verified', className: 'badge-green' },
    suspended: { label: 'Suspended', className: 'badge-red' },
    open: { label: 'Open', className: 'badge-yellow' },
    resolved: { label: 'Resolved', className: 'badge-green' },
    available: { label: 'Available', className: 'badge-green' },
    reserved: { label: 'Reserved', className: 'badge-yellow' },
    sold: { label: 'Sold', className: 'badge-gray' },
  };

  const config = statusConfig[status] || { label: status?.replace(/_/g, ' ') || 'Unknown', className: 'badge-gray' };
  return <span className={config.className}>{config.label}</span>;
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
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
      <p className="text-sm text-gray-500">
        Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
      </p>
      <div className="flex gap-1">
        <button disabled={!pagination.hasPreviousPage} onClick={() => onPageChange(pagination.page - 1)}
          className="btn-outline btn-sm">Previous</button>
        <button disabled={!pagination.hasNextPage} onClick={() => onPageChange(pagination.page + 1)}
          className="btn-outline btn-sm">Next</button>
      </div>
    </div>
  );
}
