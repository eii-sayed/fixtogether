const { ROLES, VERIFICATION_STATUS, ADMIN_PERMISSIONS } = require('../constants');

/**
 * Canonical Permission Names
 */
const PERMISSIONS = {
  // Repair Requests
  REPAIR_REQUEST_CREATE: 'repair_request.create',
  REPAIR_REQUEST_VIEW_OWN: 'repair_request.view_own',
  REPAIR_REQUEST_VIEW_PUBLISHED: 'repair_request.view_published',
  REPAIR_REQUEST_VIEW_ASSIGNED: 'repair_request.view_assigned',
  REPAIR_REQUEST_VIEW_ALL: 'repair_request.view_all',
  REPAIR_REQUEST_EDIT_OWN: 'repair_request.edit_own',
  REPAIR_REQUEST_PUBLISH: 'repair_request.publish',
  REPAIR_REQUEST_MODERATE: 'repair_request.moderate',

  // Quotations
  QUOTATION_CREATE: 'quotation.create',
  QUOTATION_UPDATE_OWN: 'quotation.update_own',
  QUOTATION_WITHDRAW_OWN: 'quotation.withdraw_own',
  QUOTATION_VIEW_RELATED: 'quotation.view_related',
  QUOTATION_ACCEPT: 'quotation.accept',

  // Repair Jobs
  REPAIR_JOB_VIEW_RELATED: 'repair_job.view_related',
  REPAIR_JOB_UPDATE_ASSIGNED: 'repair_job.update_assigned',
  REPAIR_JOB_APPROVE_COST: 'repair_job.approve_cost',
  REPAIR_JOB_COMPLETE: 'repair_job.complete',
  REPAIR_JOB_MODERATE: 'repair_job.moderate',

  // Donation Offers & Operations
  DONATION_OFFER_CREATE: 'donation_offer.create',
  DONATION_OFFER_VIEW_RELATED: 'donation_offer.view_related',
  DONATION_OFFER_REVIEW: 'donation_offer.review',
  DONATION_OFFER_ACCEPT: 'donation_offer.accept',
  DONATION_OFFER_PROCESS: 'donation_offer.process',

  // Community Needs
  DONATION_NEED_CREATE: 'donation_need.create',
  DONATION_NEED_MANAGE_OWN: 'donation_need.manage_own',
  DONATION_NEED_VIEW_PUBLIC: 'donation_need.view_public',

  // Verifications
  VERIFICATION_SUBMIT: 'verification.submit',
  VERIFICATION_VIEW_OWN: 'verification.view_own',
  VERIFICATION_REVIEW: 'verification.review',
  VERIFICATION_APPROVE: 'verification.approve',

  // Admin Scoped Permissions
  ADMIN_USERS_VIEW: 'admin.users.view',
  ADMIN_USERS_MODERATE: 'admin.users.moderate',
  ADMIN_VERIFICATIONS_REVIEW: 'admin.verifications.review',
  ADMIN_SAFETY_REVIEW: 'admin.safety.review',
  ADMIN_SAFETY_MANAGE: 'admin.safety.manage',
  ADMIN_DISPUTES_RESOLVE: 'admin.disputes.resolve',
  ADMIN_TAXONOMY_MANAGE: 'admin.taxonomy.manage',
  ADMIN_ANALYTICS_VIEW: 'admin.analytics.view',
  ADMIN_AUDIT_VIEW: 'admin.audit.view',
  ADMIN_PERMISSIONS_MANAGE: 'admin.permissions.manage',
};

/**
 * Check if a user possesses a specific permission in a given context
 * @param {Object} user - Authenticated user payload { userId, role, adminPermissions, verificationStatus }
 * @param {string} permission - One of PERMISSIONS constants
 * @param {Object} [context] - Contextual resource identifiers { ownerId, assignedTechnicianId, organizationId, status, isPublished }
 * @returns {boolean}
 */
const hasPermission = (user, permission, context = {}) => {
  if (!user) return false;

  const { role, adminPermissions = [], userId } = user;
  const currentUserId = userId?.toString();

  // Super admin possesses all permissions
  if (role === ROLES.ADMIN) {
    if (adminPermissions.includes('super_admin') || adminPermissions.length === 0) return true;

    // Check fine-grained admin scopes
    switch (permission) {
      case PERMISSIONS.ADMIN_USERS_VIEW:
      case PERMISSIONS.ADMIN_USERS_MODERATE:
        return adminPermissions.includes(ADMIN_PERMISSIONS.SUPPORT) || adminPermissions.includes('super_admin');
      case PERMISSIONS.ADMIN_VERIFICATIONS_REVIEW:
      case PERMISSIONS.VERIFICATION_REVIEW:
      case PERMISSIONS.VERIFICATION_APPROVE:
        return adminPermissions.includes(ADMIN_PERMISSIONS.VERIFICATION) || adminPermissions.includes('super_admin');
      case PERMISSIONS.ADMIN_SAFETY_REVIEW:
      case PERMISSIONS.ADMIN_SAFETY_MANAGE:
        return adminPermissions.includes(ADMIN_PERMISSIONS.SAFETY) || adminPermissions.includes('super_admin');
      case PERMISSIONS.ADMIN_DISPUTES_RESOLVE:
        return adminPermissions.includes(ADMIN_PERMISSIONS.DISPUTES) || adminPermissions.includes('super_admin');
      case PERMISSIONS.ADMIN_TAXONOMY_MANAGE:
      case PERMISSIONS.ADMIN_ANALYTICS_VIEW:
        return adminPermissions.includes(ADMIN_PERMISSIONS.CONFIG) || adminPermissions.includes('super_admin');
      case PERMISSIONS.ADMIN_AUDIT_VIEW:
        return adminPermissions.includes(ADMIN_PERMISSIONS.AUDIT) || adminPermissions.includes('super_admin');
      case PERMISSIONS.ADMIN_PERMISSIONS_MANAGE:
        return adminPermissions.includes('super_admin');
      default:
        return true; // General admin read/moderate access
    }
  }

  // Role: OWNER
  if (role === ROLES.OWNER) {
    switch (permission) {
      case PERMISSIONS.REPAIR_REQUEST_CREATE:
      case PERMISSIONS.DONATION_OFFER_CREATE:
      case PERMISSIONS.DONATION_NEED_VIEW_PUBLIC:
        return true;
      case PERMISSIONS.REPAIR_REQUEST_VIEW_OWN:
      case PERMISSIONS.REPAIR_REQUEST_EDIT_OWN:
      case PERMISSIONS.REPAIR_REQUEST_PUBLISH:
      case PERMISSIONS.DONATION_OFFER_VIEW_RELATED:
        return !context.ownerId || context.ownerId.toString() === currentUserId;
      case PERMISSIONS.QUOTATION_ACCEPT:
      case PERMISSIONS.REPAIR_JOB_APPROVE_COST:
        return !context.ownerId || context.ownerId.toString() === currentUserId;
      default:
        return false;
    }
  }

  // Role: TECHNICIAN
  if (role === ROLES.TECHNICIAN) {
    switch (permission) {
      case PERMISSIONS.REPAIR_REQUEST_VIEW_PUBLISHED:
      case PERMISSIONS.DONATION_NEED_VIEW_PUBLIC:
        return true;
      case PERMISSIONS.QUOTATION_CREATE:
        return true;
      case PERMISSIONS.QUOTATION_UPDATE_OWN:
      case PERMISSIONS.QUOTATION_WITHDRAW_OWN:
        return !context.technicianId || context.technicianId.toString() === currentUserId;
      case PERMISSIONS.REPAIR_JOB_VIEW_RELATED:
      case PERMISSIONS.REPAIR_JOB_UPDATE_ASSIGNED:
      case PERMISSIONS.REPAIR_JOB_COMPLETE:
        return !context.assignedTechnicianId || context.assignedTechnicianId.toString() === currentUserId;
      case PERMISSIONS.VERIFICATION_SUBMIT:
      case PERMISSIONS.VERIFICATION_VIEW_OWN:
        return true;
      default:
        return false;
    }
  }

  // Role: ORGANIZATION
  if (role === ROLES.ORGANIZATION) {
    switch (permission) {
      case PERMISSIONS.DONATION_NEED_CREATE:
      case PERMISSIONS.DONATION_NEED_MANAGE_OWN:
      case PERMISSIONS.DONATION_OFFER_REVIEW:
      case PERMISSIONS.DONATION_OFFER_ACCEPT:
      case PERMISSIONS.DONATION_OFFER_PROCESS:
      case PERMISSIONS.DONATION_NEED_VIEW_PUBLIC:
      case PERMISSIONS.VERIFICATION_SUBMIT:
      case PERMISSIONS.VERIFICATION_VIEW_OWN:
        return true;
      default:
        return false;
    }
  }

  return false;
};

module.exports = {
  PERMISSIONS,
  hasPermission,
};
