import {
  Wrench,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  DollarSign,
  Calendar,
  Package,
  Heart,
  Sparkles,
  UserCheck,
  Bell,
  RotateCcw,
} from 'lucide-react';

/**
 * Determine the destination route for a given notification.
 * Considers explicit link, related entities, notification types, and user role.
 */
export const getNotificationDestination = (notification, userRole) => {
  if (notification?.link && typeof notification.link === 'string' && notification.link.trim() !== '') {
    return notification.link;
  }

  const { type, relatedEntityType, relatedEntityId } = notification || {};

  // 1. By Explicit Entity Relationship
  if (relatedEntityType === 'RepairRequest' && relatedEntityId) {
    if (type === 'new_message') {
      return `/chat?repairId=${relatedEntityId}`;
    }
    return `/repair-requests/${relatedEntityId}`;
  }

  if (relatedEntityType === 'RepairJob') {
    return '/repair-jobs';
  }

  if (relatedEntityType === 'Thread' && relatedEntityId) {
    return `/forum/${relatedEntityId}`;
  }

  if (relatedEntityType === 'Appointment') {
    return '/repair-jobs';
  }

  if (relatedEntityType === 'Dispute') {
    return userRole === 'admin' ? '/admin/disputes' : '/repair-jobs';
  }

  if (['DonationOffer', 'CommunityNeed', 'DonationItem'].includes(relatedEntityType)) {
    return '/donations';
  }

  if (relatedEntityType === 'Technician' && relatedEntityId) {
    return `/technicians/${relatedEntityId}`;
  }

  if (relatedEntityType === 'User' && relatedEntityId) {
    return `/users/${relatedEntityId}`;
  }

  // 2. By Notification Type Category Fallback
  if (type) {
    // Repair request & Quotation flows
    if (
      type.startsWith('repair_') ||
      type.startsWith('quotation_') ||
      type === 'owner_approval_required' ||
      type === 'technician_match' ||
      type === 'part_required'
    ) {
      if (type === 'repair_completed' || type === 'job_status_updated') {
        return userRole === 'technician' ? '/repair-jobs' : (relatedEntityId ? `/repair-requests/${relatedEntityId}` : '/repair-requests');
      }
      return relatedEntityId ? `/repair-requests/${relatedEntityId}` : '/repair-requests';
    }

    // Direct Messages / Chat
    if (type === 'new_message') {
      return relatedEntityId ? `/chat?repairId=${relatedEntityId}` : '/messages';
    }

    // Community / Forum
    if (type.startsWith('forum_')) {
      return relatedEntityId ? `/forum/${relatedEntityId}` : '/forum';
    }

    // Donations & Impact
    if (type.startsWith('donation_') || type.startsWith('impact_')) {
      return '/donations';
    }

    // Account & Profile
    if (type.startsWith('account_') || type === 'review_received') {
      return userRole === 'technician' ? '/profile' : '/profile';
    }

    // Disputes
    if (type.startsWith('dispute_')) {
      return userRole === 'admin' ? '/admin/disputes' : '/repair-jobs';
    }

    // Warranties
    if (type.startsWith('warranty_')) {
      return '/repair-jobs';
    }
  }

  return '/notifications';
};

/**
 * Returns visual meta (icon component, container bg, icon color, label) for a notification
 */
export const getNotificationMeta = (notification) => {
  const { type, relatedEntityType } = notification || {};

  // Messages
  if (type === 'new_message' || relatedEntityType === 'Message') {
    return {
      icon: MessageSquare,
      bg: 'bg-cyan-50 border-cyan-200/80',
      color: 'text-cyan-600',
      category: 'Message',
    };
  }

  // Repairs & Jobs
  if (
    type?.startsWith('repair_') ||
    type === 'part_required' ||
    relatedEntityType === 'RepairJob' ||
    relatedEntityType === 'RepairRequest'
  ) {
    if (type === 'repair_completed') {
      return {
        icon: CheckCircle2,
        bg: 'bg-emerald-50 border-emerald-200/80',
        color: 'text-emerald-600',
        category: 'Completed',
      };
    }
    return {
      icon: Wrench,
      bg: 'bg-primary-50 border-primary-200/80',
      color: 'text-primary-600',
      category: 'Repair',
    };
  }

  // Quotations
  if (type?.startsWith('quotation_') || relatedEntityType === 'Quotation') {
    return {
      icon: DollarSign,
      bg: 'bg-amber-50 border-amber-200/80',
      color: 'text-amber-600',
      category: 'Quotation',
    };
  }

  // Appointments
  if (type?.startsWith('appointment_') || relatedEntityType === 'Appointment') {
    return {
      icon: Calendar,
      bg: 'bg-blue-50 border-blue-200/80',
      color: 'text-blue-600',
      category: 'Appointment',
    };
  }

  // Disputes & Approvals
  if (type?.startsWith('dispute_') || type === 'owner_approval_required' || relatedEntityType === 'Dispute') {
    return {
      icon: AlertTriangle,
      bg: 'bg-rose-50 border-rose-200/80',
      color: 'text-rose-600',
      category: 'Action Required',
    };
  }

  // Donations & Needs
  if (
    type?.startsWith('donation_') ||
    type?.startsWith('impact_') ||
    ['DonationOffer', 'CommunityNeed', 'DonationItem'].includes(relatedEntityType)
  ) {
    return {
      icon: Heart,
      bg: 'bg-pink-50 border-pink-200/80',
      color: 'text-pink-600',
      category: 'Donation',
    };
  }

  // Forum / Community
  if (type?.startsWith('forum_') || relatedEntityType === 'Thread') {
    return {
      icon: Sparkles,
      bg: 'bg-purple-50 border-purple-200/80',
      color: 'text-purple-600',
      category: 'Community',
    };
  }

  // Account / Verification
  if (type?.startsWith('account_')) {
    return {
      icon: UserCheck,
      bg: 'bg-emerald-50 border-emerald-200/80',
      color: 'text-emerald-600',
      category: 'Account',
    };
  }

  // Warranties
  if (type?.startsWith('warranty_') || relatedEntityType === 'Warranty') {
    return {
      icon: ShieldCheck,
      bg: 'bg-teal-50 border-teal-200/80',
      color: 'text-teal-600',
      category: 'Warranty',
    };
  }

  return {
    icon: Bell,
    bg: 'bg-gray-100 border-gray-200',
    color: 'text-gray-600',
    category: 'Notification',
  };
};

/**
 * Format relative friendly timestamps
 */
export const formatRelativeTime = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
