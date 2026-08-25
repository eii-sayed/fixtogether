import {
  Calendar,
  Package,
  Search,
  AlertCircle,
  Clock,
  Wrench,
  CheckSquare,
  PackageCheck,
  Award,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  FileText,
  UserCheck,
  Truck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

/**
 * 10 Canonical Stages for Active Repair Jobs
 */
export const ACTIVE_JOB_STAGES = [
  { id: 'pending_appointment', label: '1. Appointment', shortLabel: 'Schedule' },
  { id: 'item_received', label: '2. Received', shortLabel: 'Received' },
  { id: 'under_inspection', label: '3. Inspection', shortLabel: 'Inspection' },
  { id: 'awaiting_approval', label: '4. Cost Approval', shortLabel: 'Approval' },
  { id: 'waiting_for_parts', label: '5. Parts Transit', shortLabel: 'Parts' },
  { id: 'in_progress', label: '6. In Progress', shortLabel: 'Repairing' },
  { id: 'quality_check', label: '7. Quality Check', shortLabel: 'Testing' },
  { id: 'ready_for_collection', label: '8. Ready for Pickup', shortLabel: 'Ready' },
  { id: 'handover', label: '9. Handover', shortLabel: 'Handover' },
  { id: 'completed', label: '10. Completed', shortLabel: 'Warranty' },
];

/**
 * Job Status Configuration with role actions and context tips
 */
export const JOB_STATUS_CONFIG = {
  pending_inspection: {
    label: 'Pending Inspection',
    badgeClass: 'badge-yellow',
    color: 'yellow',
    icon: Clock,
    stageIndex: 0,
    description: 'Item handover appointment confirmed. Awaiting physical intake & preliminary diagnostic benching.',
    technicianAction: {
      primary: { label: 'Record Inspection', action: 'open_inspection', icon: Search },
      secondary: { label: 'Message Owner', action: 'open_chat', icon: FileText },
    },
    ownerAction: {
      primary: { label: 'Message Technician', action: 'open_chat', icon: FileText },
    },
  },
  inspecting: {
    label: 'Under Inspection',
    badgeClass: 'badge-purple',
    color: 'purple',
    icon: Search,
    stageIndex: 2,
    description: 'Technician is performing hardware disassembly and fault diagnosis.',
    technicianAction: {
      primary: { label: 'Update Findings / Cost', action: 'open_cost_approval', icon: AlertCircle },
      secondary: { label: 'Start Repair Work', action: 'start_repair', icon: Wrench },
    },
    ownerAction: {
      primary: { label: 'View Inspection Report', action: 'view_inspection', icon: Search },
      secondary: { label: 'Message Technician', action: 'open_chat', icon: FileText },
    },
  },
  awaiting_approval: {
    label: 'Cost Approval Pending',
    badgeClass: 'badge-yellow',
    color: 'yellow',
    icon: AlertCircle,
    stageIndex: 3,
    description: 'Additional parts or labor require explicit owner confirmation before proceeding.',
    technicianAction: {
      primary: { label: 'Message Owner', action: 'open_chat', icon: FileText },
      secondary: { label: 'View Request Details', action: 'view_cost_approval', icon: AlertCircle },
    },
    ownerAction: {
      primary: { label: 'Review & Respond to Cost', action: 'review_cost_approval', icon: AlertCircle },
      secondary: { label: 'Message Technician', action: 'open_chat', icon: FileText },
    },
  },
  waiting_for_parts: {
    label: 'Waiting for Parts',
    badgeClass: 'badge-yellow',
    color: 'yellow',
    icon: Package,
    stageIndex: 4,
    description: 'Replacement parts have been ordered and are in transit to workshop.',
    technicianAction: {
      primary: { label: 'Update Part Arrival', action: 'open_parts_tracker', icon: Package },
      secondary: { label: 'Message Owner', action: 'open_chat', icon: FileText },
    },
    ownerAction: {
      primary: { label: 'Track Parts Progress', action: 'view_parts', icon: Package },
      secondary: { label: 'Message Technician', action: 'open_chat', icon: FileText },
    },
  },
  in_progress: {
    label: 'Repair in Progress',
    badgeClass: 'badge-blue',
    color: 'blue',
    icon: Wrench,
    stageIndex: 5,
    description: 'Hardware repair, component replacement, and assembly underway.',
    technicianAction: {
      primary: { label: 'Run Quality Check', action: 'open_quality_check', icon: CheckSquare },
      secondary: { label: 'Request Additional Parts', action: 'open_parts_tracker', icon: Package },
    },
    ownerAction: {
      primary: { label: 'Message Technician', action: 'open_chat', icon: FileText },
    },
  },
  quality_check: {
    label: 'Quality Check & Testing',
    badgeClass: 'badge-purple',
    color: 'purple',
    icon: CheckSquare,
    stageIndex: 6,
    description: 'Post-repair diagnostic bench testing, power safety verification, and cleaning.',
    technicianAction: {
      primary: { label: 'Complete QA & Mark Ready', action: 'open_quality_check', icon: CheckSquare },
      secondary: { label: 'Rework Repair', action: 'rework_repair', icon: RotateCcw },
    },
    ownerAction: {
      primary: { label: 'Message Technician', action: 'open_chat', icon: FileText },
    },
  },
  ready_for_collection: {
    label: 'Ready for Collection',
    badgeClass: 'badge-green',
    color: 'green',
    icon: PackageCheck,
    stageIndex: 7,
    description: 'Item successfully restored and ready for collection / return handover.',
    technicianAction: {
      primary: { label: 'Record Handover', action: 'record_handover', icon: PackageCheck },
      secondary: { label: 'Message Owner', action: 'open_chat', icon: FileText },
    },
    ownerAction: {
      primary: { label: 'Confirm Receipt & Activate Warranty', action: 'confirm_handover', icon: Award },
      secondary: { label: 'Report Issue / Dispute', action: 'open_dispute', icon: AlertTriangle },
    },
  },
  completed: {
    label: 'Completed & Under Warranty',
    badgeClass: 'badge-green',
    color: 'green',
    icon: Award,
    stageIndex: 9,
    description: 'Repair completed, handover confirmed, and digital warranty activated.',
    technicianAction: {
      primary: { label: 'View Digital Warranty', action: 'view_warranty', icon: ShieldCheck },
    },
    ownerAction: {
      primary: { label: 'Write Review', action: 'write_review', icon: Award },
      secondary: { label: 'View Warranty', action: 'view_warranty', icon: ShieldCheck },
    },
  },
  unsuccessful: {
    label: 'Repair Unsuccessful',
    badgeClass: 'badge-red',
    color: 'red',
    icon: XCircle,
    stageIndex: 9,
    description: 'Device not economically repairable. Converted to alternative pathways.',
    technicianAction: null,
    ownerAction: {
      primary: { label: 'Donate for Parts', action: 'donate_item', icon: Package },
      secondary: { label: 'Collect Device', action: 'collect_item', icon: PackageCheck },
    },
  },
  disputed: {
    label: 'Disputed',
    badgeClass: 'badge-red',
    color: 'red',
    icon: AlertTriangle,
    stageIndex: 9,
    description: 'Mediation open with FixTogether Administrative Team.',
    technicianAction: {
      primary: { label: 'View Dispute Details', action: 'view_dispute', icon: AlertTriangle },
    },
    ownerAction: {
      primary: { label: 'View Dispute Details', action: 'view_dispute', icon: AlertTriangle },
    },
  },
};

/**
 * Part Status Configuration
 */
export const PART_STATUS_CONFIG = {
  required: { label: 'Required', badgeClass: 'badge-gray', color: 'gray', icon: Clock },
  searching: { label: 'Searching Supplier', badgeClass: 'badge-yellow', color: 'yellow', icon: Search },
  ordered: { label: 'Ordered', badgeClass: 'badge-blue', color: 'blue', icon: Package },
  in_transit: { label: 'In Transit', badgeClass: 'badge-purple', color: 'purple', icon: Truck },
  received: { label: 'Received at Workshop', badgeClass: 'badge-green', color: 'green', icon: PackageCheck },
  installed: { label: 'Installed & Tested', badgeClass: 'badge-green', color: 'green', icon: CheckSquare },
  returned: { label: 'Returned', badgeClass: 'badge-gray', color: 'gray', icon: RotateCcw },
  unavailable: { label: 'Unavailable / Out of Stock', badgeClass: 'badge-red', color: 'red', icon: XCircle },
};

/**
 * Category-specific Inspection Checklists
 */
export const CATEGORY_INSPECTION_CHECKLISTS = {
  electronics: [
    { id: 'power_rail', label: 'Power supply & voltage rails check' },
    { id: 'short_circuit', label: 'Short-circuit & continuity test' },
    { id: 'component_burn', label: 'Visual board inspection (burns, blown caps)' },
    { id: 'corrosion', label: 'Liquid damage & corrosion inspection' },
    { id: 'connector_pins', label: 'Flex cable & ribbon connector integrity' },
  ],
  appliances: [
    { id: 'ground_safety', label: 'Grounding & chassis leakage safety test' },
    { id: 'fuse_thermal', label: 'Thermal cutoff & fuse resistance test' },
    { id: 'motor_brushes', label: 'Motor windings & brush wear examination' },
    { id: 'seal_leaks', label: 'Gasket, hose & pressure seal inspection' },
    { id: 'control_board', label: 'Control board relays and switches test' },
  ],
  computers: [
    { id: 'post_boot', label: 'POST power-on self test' },
    { id: 'display_gpu', label: 'Display panel and GPU output test' },
    { id: 'battery_health', label: 'Battery internal resistance & cycle count' },
    { id: 'storage_health', label: 'Storage SMART health & sector diagnosis' },
    { id: 'thermal_throttling', label: 'Thermal paste & cooling fan operation' },
  ],
  mobile_phones: [
    { id: 'screen_digitizer', label: 'Touch digitizer and OLED/LCD integrity' },
    { id: 'charging_port', label: 'Charging port amperage draw & data pins' },
    { id: 'battery_swelling', label: 'Battery expansion and cell degradation' },
    { id: 'mic_speaker', label: 'Earpiece, speaker, and microphone audio test' },
    { id: 'camera_sensors', label: 'Front/rear camera and proximity sensor test' },
  ],
  default: [
    { id: 'visual_damage', label: 'External casing and physical damage assessment' },
    { id: 'power_intake', label: 'Power delivery and connectivity test' },
    { id: 'core_function', label: 'Primary operational function test' },
    { id: 'mechanical_wear', label: 'Mechanical moving parts wear assessment' },
    { id: 'fasteners_chassis', label: 'Screws, clips, and chassis structural check' },
  ],
};

/**
 * Standard Quality Check Checklist
 */
export const QUALITY_CHECK_ITEMS = [
  { id: 'fault_resolved', title: 'Original Reported Fault Resolved', description: 'Verified that the primary reported issue is 100% eliminated.' },
  { id: 'power_safety', title: 'Electrical & Power Safety Checked', description: 'No voltage leakage, improper grounding, or abnormal heat.' },
  { id: 'core_function', title: 'Core Device Features Verified', description: 'All secondary buttons, ports, and controls tested and working.' },
  { id: 'parts_fastened', title: 'Replaced Parts Firmly Fastened', description: 'All internal brackets, screws, and clips torqued properly.' },
  { id: 'device_cleaned', title: 'Device Cleaned & Dust-Free', description: 'Post-repair cleaning completed before customer collection.' },
];
