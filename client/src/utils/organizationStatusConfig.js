import {
  Heart,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Truck,
  Building,
  Shield,
  Sparkles,
  Recycle,
  Wrench,
  Search,
} from 'lucide-react';

export const DONATION_STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: Clock,
  },
  submitted: {
    label: 'New Offer',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Sparkles,
  },
  published: {
    label: 'Published Offer',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Sparkles,
  },
  matched: {
    label: 'High Match',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Sparkles,
  },
  under_review: {
    label: 'Under Review',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Search,
  },
  accepted: {
    label: 'Accepted',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle,
  },
  handover_scheduled: {
    label: 'Collection Scheduled',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: Truck,
  },
  pickup_scheduled: {
    label: 'Pickup Scheduled',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: Truck,
  },
  in_transit: {
    label: 'In Transit',
    color: 'bg-sky-100 text-sky-800 border-sky-200',
    icon: Truck,
  },
  awaiting_dropoff: {
    label: 'Awaiting Dropoff',
    color: 'bg-sky-100 text-sky-800 border-sky-200',
    icon: Building,
  },
  received: {
    label: 'Received at Hub',
    color: 'bg-teal-100 text-teal-800 border-teal-200',
    icon: Package,
  },
  inspection_pending: {
    label: 'Inspection Pending',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Wrench,
  },
  inspected: {
    label: 'Inspected',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: CheckCircle,
  },
  processing: {
    label: 'Processing Bench',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Wrench,
  },
  completed: {
    label: 'Impact Verified',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Declined',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
  },
  rejected_after_inspection: {
    label: 'Rejected in Inspection',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertTriangle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: XCircle,
  },
};

export const COMMUNITY_NEED_STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  published: { label: 'Active Seeking', color: 'bg-blue-100 text-blue-800' },
  partially_matched: { label: 'Offers In Review', color: 'bg-purple-100 text-purple-800' },
  partially_fulfilled: { label: 'Partially Received', color: 'bg-amber-100 text-amber-800' },
  fulfilled: { label: 'Target Fulfilled', color: 'bg-emerald-100 text-emerald-800' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600' },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
};

export const INSPECTION_OUTCOMES_CONFIG = {
  accepted_working: {
    label: 'Accepted as Working',
    description: 'Fully functional, ready for direct community redistribution.',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  accepted_for_refurbishment: {
    label: 'Accepted for Refurbishment',
    description: 'Minor hardware repairs, cleaning, or OS re-installation required.',
    badge: 'bg-blue-100 text-blue-800',
  },
  accepted_for_parts: {
    label: 'Accepted for Parts Salvage',
    description: 'Harvest valuable components (RAM, storage, screens, boards).',
    badge: 'bg-purple-100 text-purple-800',
  },
  accepted_for_recycling: {
    label: 'Accepted for Responsible Recycling',
    description: 'Unfixable hazardous hardware forwarded to certified recycling partner.',
    badge: 'bg-teal-100 text-teal-800',
  },
  rejected_safety: {
    label: 'Rejected - Critical Safety Risk',
    description: 'Swollen battery, exposed high-voltage wiring, or hazardous contamination.',
    badge: 'bg-red-100 text-red-800',
  },
  rejected_condition_mismatch: {
    label: 'Rejected - Material Mismatch',
    description: 'Physical state drastically differs from offered description.',
    badge: 'bg-amber-100 text-amber-800',
  },
  more_info_required: {
    label: 'Clarification Needed',
    description: 'Missing passcodes, proprietary power brick, or missing parts.',
    badge: 'bg-yellow-100 text-yellow-800',
  },
};

export const PROCESSING_OUTCOMES_CONFIG = {
  redistributed: {
    label: 'Redistributed to Beneficiaries',
    color: 'bg-emerald-100 text-emerald-800',
    icon: Heart,
  },
  refurbished: {
    label: 'Refurbished & Re-deployed',
    color: 'bg-blue-100 text-blue-800',
    icon: Wrench,
  },
  salvaged_parts: {
    label: 'Salvaged for Community Repairs',
    color: 'bg-purple-100 text-purple-800',
    icon: Package,
  },
  responsibly_recycled: {
    label: 'Responsibly Recycled (Zero Landfill)',
    color: 'bg-teal-100 text-teal-800',
    icon: Recycle,
  },
  rejected_after_inspection: {
    label: 'Safely Decommissioned / Returned',
    color: 'bg-red-100 text-red-800',
    icon: AlertTriangle,
  },
};

export const HUB_STATUS_CONFIG = {
  active: { label: 'Active Hub', color: 'bg-emerald-100 text-emerald-800' },
  temporarily_closed: { label: 'Temporarily Closed', color: 'bg-amber-100 text-amber-800' },
  at_capacity: { label: 'At Storage Capacity', color: 'bg-red-100 text-red-800' },
  appointment_only: { label: 'Appointment Only', color: 'bg-blue-100 text-blue-800' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-600' },
};
