/**
 * Admin Status and Priority Display Configuration
 * Canonical colors, badges, and icons for FixTogether Administrator Workspace
 */

export const ADMIN_PRIORITIES = {
  critical: {
    label: 'Critical',
    bg: 'bg-red-500/10 text-red-500 border-red-500/30',
    badge: 'bg-red-500 text-white',
    dot: 'bg-red-500 animate-pulse',
    icon: 'AlertTriangle',
  },
  high: {
    label: 'High',
    bg: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    badge: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
    icon: 'AlertCircle',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    badge: 'bg-blue-500 text-white',
    dot: 'bg-blue-500',
    icon: 'Clock',
  },
  low: {
    label: 'Low',
    bg: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30',
    badge: 'bg-neutral-600 text-white',
    dot: 'bg-neutral-400',
    icon: 'Info',
  },
};

export const REVIEW_QUEUE_STATES = {
  pending: {
    label: 'Pending Review',
    bg: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  },
  in_review: {
    label: 'In Review',
    bg: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  },
  escalated: {
    label: 'Escalated',
    bg: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  },
  snoozed: {
    label: 'Snoozed',
    bg: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30',
  },
  resolved: {
    label: 'Resolved',
    bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  },
};

export const VERIFICATION_STAGES = {
  pending: {
    label: 'Pending Review',
    bg: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  },
  approved: {
    label: 'Verified & Active',
    bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-red-500/10 text-red-500 border-red-500/30',
  },
  more_info_needed: {
    label: 'Info Requested',
    bg: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  },
  expired: {
    label: 'Documents Expired',
    bg: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
  },
};

export const DISPUTE_RESOLUTIONS = {
  full_resolution: {
    label: 'Full Resolution (Uphold terms)',
    desc: 'Upholds original service terms and releases obligations accordingly.',
  },
  partial_settlement: {
    label: 'Partial Labor Settlement',
    desc: 'Authorizes an agreed labor or parts discount adjustment.',
  },
  free_rework: {
    label: 'Free Rework Authorization',
    desc: 'Orders technician to perform corrective repair at no additional charge.',
  },
  warranty_enforced: {
    label: 'Warranty Service Enforcement',
    desc: 'Enforces active warranty coverage for parts and labor.',
  },
  mutual_closure: {
    label: 'Mutual Closure (No Penalty)',
    desc: 'Closes dispute with mutual agreement without negative record for either party.',
  },
};

/**
 * Format remaining SLA hours/minutes into human friendly badge
 */
export const formatSLACountdown = (slaDeadline) => {
  if (!slaDeadline) return { text: 'No SLA', isBreached: false, isUrgent: false };
  const diff = new Date(slaDeadline).getTime() - Date.now();
  if (diff <= 0) {
    const overdueHours = Math.abs(Math.floor(diff / (1000 * 60 * 60)));
    return { text: `SLA Breached (${overdueHours}h overdue)`, isBreached: true, isUrgent: true };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours < 4) {
    return { text: `${hours}h ${mins}m remaining`, isBreached: false, isUrgent: true };
  }
  return { text: `${hours}h remaining`, isBreached: false, isUrgent: false };
};
