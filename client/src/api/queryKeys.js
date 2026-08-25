/**
 * Centralized TanStack Query Key Factory
 * Prevents key collision, excessive invalidations, and query refetch loops.
 */

export const queryKeys = {
  // Authentication & Current User
  auth: {
    me: () => ['auth', 'me'],
    profile: () => ['user', 'profile'],
  },

  // Repair Requests
  repairRequests: {
    all: () => ['repair-requests'],
    list: (filters = {}) => ['repair-requests', 'list', filters],
    detail: (id) => ['repair-requests', 'detail', id],
    matches: (id) => ['repair-requests', 'matches', id],
  },

  // Quotations
  quotations: {
    all: () => ['quotations'],
    byRequest: (requestId) => ['quotations', 'request', requestId],
    myQuotations: (status) => ['quotations', 'my', status],
    detail: (id) => ['quotations', 'detail', id],
  },

  // Repair Jobs
  repairJobs: {
    all: () => ['repair-jobs'],
    active: (filters = {}) => ['repair-jobs', 'active', filters],
    detail: (id) => ['repair-jobs', 'detail', id],
    history: (id) => ['repair-jobs', 'history', id],
  },

  // Appointments
  appointments: {
    all: () => ['appointments'],
    mySchedule: () => ['appointments', 'my-schedule'],
    detail: (id) => ['appointments', 'detail', id],
  },

  // Messages & Conversations
  messages: {
    conversations: () => ['messages', 'conversations'],
    conversation: (participantId) => ['messages', 'conversation', participantId],
    unreadCount: () => ['messages', 'unread-count'],
  },

  // Notifications
  notifications: {
    all: () => ['notifications'],
    list: (filters = {}) => ['notifications', 'list', filters],
    unreadCount: () => ['notifications', 'unread-count'],
  },

  // Donation Operations
  donations: {
    all: () => ['donations'],
    offers: (tab = 'all', filters = {}) => ['donation-offers', tab, filters],
    offerDetail: (id) => ['donation-offers', 'detail', id],
    matchExplanation: (id) => ['donation-offers', 'match-explanation', id],
    needs: (filters = {}) => ['community-needs', filters],
    workspace: () => ['org-workspace'],
    impact: () => ['org-impact-ledger'],
    hubs: () => ['org-hubs'],
  },

  // Admin Command Center & Queues
  admin: {
    overview: () => ['admin', 'overview'],
    reviewQueue: (tab = 'all') => ['admin', 'review-queue', tab],
    users: (filters = {}) => ['admin', 'users', filters],
    verifications: (filters = {}) => ['admin', 'verifications', filters],
    safety: (filters = {}) => ['admin', 'safety', filters],
    disputes: (filters = {}) => ['admin', 'disputes', filters],
    auditLogs: (filters = {}) => ['admin', 'audit-logs', filters],
    taxonomy: () => ['admin', 'taxonomy'],
  },
};
