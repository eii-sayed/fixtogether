import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Wrench,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarCheck2,
  ExternalLink,
  Loader2,
  CalendarDays,
  ListFilter,
  Phone,
  Mail,
  X,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { PageLoader, EmptyState } from '../../components/ui';
import SEO from '../../components/common/SEO';

const STATUS_STYLES = {
  scheduled: { label: 'Scheduled', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  confirmed: { label: 'Confirmed', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  in_progress: { label: 'In Progress', bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  completed: { label: 'Completed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  rescheduled: { label: 'Rescheduled', bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
};

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('10:00');
  const [newEndTime, setNewEndTime] = useState('11:00');
  const [activeTab, setActiveTab] = useState('all'); // all, upcoming, completed, cancelled

  // Fetch all appointments for current user
  const { data, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.get('/appointments?limit=150').then((r) => r.data.data),
  });

  const appointments = data?.appointments || [];

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: ({ id, scheduledStart, scheduledEnd }) =>
      api.patch(`/appointments/${id}/reschedule`, { scheduledStart, scheduledEnd }),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      toast.success('Appointment successfully rescheduled.');
      setIsRescheduling(false);
      setSelectedAppointment(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to reschedule appointment');
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => api.patch(`/appointments/${id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      toast.success('Appointment cancelled.');
      setSelectedAppointment(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to cancel appointment');
    },
  });

  // Status update mutation (e.g., complete, in_progress)
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/appointments/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      toast.success('Appointment status updated.');
      setSelectedAppointment(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    },
  });

  if (isLoading) return <PageLoader />;

  // Filtered appointments
  const filteredAppointments = appointments.filter((appt) => {
    if (activeTab === 'upcoming') {
      return ['scheduled', 'confirmed', 'rescheduled'].includes(appt.status);
    }
    if (activeTab === 'completed') {
      return appt.status === 'completed';
    }
    if (activeTab === 'cancelled') {
      return appt.status === 'cancelled';
    }
    return true;
  });

  // Calendar Day Generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getAppointmentsForDay = (day) => {
    return filteredAppointments.filter((appt) => {
      if (!appt.scheduledStart) return false;
      const apptDate = parseISO(appt.scheduledStart);
      return isSameDay(day, apptDate);
    });
  };

  const selectedDayAppointments = getAppointmentsForDay(selectedDate);

  const handleRescheduleSubmit = (e) => {
    e.preventDefault();
    if (!newStartDate || !newStartTime || !newEndTime) {
      toast.error('Please specify the new date, start time, and end time.');
      return;
    }

    const scheduledStart = new Date(`${newStartDate}T${newStartTime}:00`);
    const scheduledEnd = new Date(`${newStartDate}T${newEndTime}:00`);

    if (scheduledEnd <= scheduledStart) {
      toast.error('End time must be after start time.');
      return;
    }

    rescheduleMutation.mutate({
      id: selectedAppointment._id,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
    });
  };

  return (
    <div className="page-container py-6 sm:py-8 space-y-6">
      <SEO title="Schedule & Appointments" description="View and manage scheduled repair appointments and handovers." />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Repair Schedule & Calendar
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-800">
              {appointments.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage handover slots, diagnostic bench appointments, and item collection dates.
          </p>
        </div>

        {/* View Filter Tabs */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-gray-100 p-1 rounded-xl">
          {[
            { id: 'all', label: 'All' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Calendar View (2 Cols) */}
        <div className="lg:col-span-2 card p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-4">
          {/* Calendar Navigation Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setCurrentMonth(new Date());
                  setSelectedDate(new Date());
                }}
                className="btn-secondary btn-xs text-[11px] font-bold"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-400 py-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarDays.map((day, idx) => {
              const dayAppts = getAppointmentsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[72px] sm:min-h-[88px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50/40 ring-2 ring-primary-500/20'
                      : isToday
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : isCurrentMonth
                      ? 'border-gray-100 hover:border-gray-300 bg-white'
                      : 'border-transparent bg-gray-50/40 text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-emerald-600 text-white'
                          : isSelected
                          ? 'bg-primary-600 text-white'
                          : isCurrentMonth
                          ? 'text-gray-700'
                          : 'text-gray-300'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayAppts.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-primary-500" />
                    )}
                  </div>

                  {/* Appointments Preview inside cell */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayAppts.slice(0, 2).map((appt) => {
                      const cfg = STATUS_STYLES[appt.status] || STATUS_STYLES.scheduled;
                      return (
                        <div
                          key={appt._id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppointment(appt);
                          }}
                          className={`text-[10px] font-semibold px-1 py-0.5 rounded truncate border ${cfg.bg}`}
                          title={appt.repairRequest?.title || 'Appointment'}
                        >
                          {appt.scheduledStart ? format(parseISO(appt.scheduledStart), 'h:mma') : ''}
                        </div>
                      );
                    })}
                    {dayAppts.length > 2 && (
                      <span className="text-[9px] font-bold text-gray-400 block text-right">
                        +{dayAppts.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Agenda / Appointment List (1 Col) */}
        <div className="space-y-4">
          <div className="card p-5 border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  {format(selectedDate, 'EEEE, MMM d, yyyy')}
                </h3>
                <span className="text-xs text-gray-500">
                  {selectedDayAppointments.length} appointment(s)
                </span>
              </div>
              <CalendarCheck2 className="w-5 h-5 text-primary-600" />
            </div>

            <div className="mt-4 space-y-3">
              {selectedDayAppointments.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 space-y-2">
                  <CalendarIcon className="w-8 h-8 text-gray-300 mx-auto" />
                  <p>No appointments on this date.</p>
                  <p className="text-[11px] text-gray-400">Select another date on the calendar grid.</p>
                </div>
              ) : (
                selectedDayAppointments.map((appt) => {
                  const cfg = STATUS_STYLES[appt.status] || STATUS_STYLES.scheduled;
                  const otherParty = user?.role === 'technician' ? appt.owner : appt.technician;

                  return (
                    <div
                      key={appt._id}
                      onClick={() => setSelectedAppointment(appt)}
                      className="p-3.5 rounded-xl border border-gray-200 hover:border-primary-400 hover:shadow-xs transition-all cursor-pointer bg-white space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.bg}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {appt.scheduledStart && format(parseISO(appt.scheduledStart), 'h:mm a')}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
                        {appt.repairRequest?.title || 'Repair Handover'}
                      </h4>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium text-gray-700">
                          {otherParty?.fullName || 'User'}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          ({user?.role === 'technician' ? 'Owner' : 'Technician'})
                        </span>
                      </div>

                      {appt.location && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 truncate">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{appt.location}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Detail & Actions Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedAppointment(null);
                setIsRescheduling(false);
              }}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    STATUS_STYLES[selectedAppointment.status]?.bg || 'bg-gray-100'
                  }`}
                >
                  {STATUS_STYLES[selectedAppointment.status]?.label || selectedAppointment.status}
                </span>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  {selectedAppointment.appointmentType?.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {selectedAppointment.repairRequest?.title || 'Repair Appointment Details'}
              </h2>
            </div>

            {/* Key Metadata Details */}
            <div className="space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-100 text-xs">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-4 h-4 text-primary-600 shrink-0" />
                <span>
                  <strong>Date & Time:</strong>{' '}
                  {selectedAppointment.scheduledStart &&
                    format(parseISO(selectedAppointment.scheduledStart), 'EEEE, MMMM d, yyyy • h:mm a')}
                  {selectedAppointment.scheduledEnd &&
                    ` – ${format(parseISO(selectedAppointment.scheduledEnd), 'h:mm a')}`}
                </span>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-4 h-4 text-primary-600 shrink-0" />
                <span>
                  <strong>Location:</strong> {selectedAppointment.location || 'Technician Workshop / Handover Point'}
                </span>
              </div>

              {selectedAppointment.notes && (
                <div className="pt-2 border-t border-gray-200/60 text-gray-600">
                  <strong>Notes:</strong> {selectedAppointment.notes}
                </div>
              )}
            </div>

            {/* Counterparty Information */}
            <div className="p-3.5 rounded-xl border border-gray-100 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                  {(user?.role === 'technician'
                    ? selectedAppointment.owner?.fullName?.[0]
                    : selectedAppointment.technician?.fullName?.[0]) || 'U'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    {user?.role === 'technician'
                      ? selectedAppointment.owner?.fullName
                      : selectedAppointment.technician?.fullName}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {user?.role === 'technician' ? 'Item Owner' : 'Certified Technician'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(user?.role === 'technician'
                  ? selectedAppointment.owner?.phone
                  : selectedAppointment.technician?.phone) && (
                  <a
                    href={`tel:${
                      user?.role === 'technician'
                        ? selectedAppointment.owner?.phone
                        : selectedAppointment.technician?.phone
                    }`}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    title="Call"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                {(user?.role === 'technician'
                  ? selectedAppointment.owner?.email
                  : selectedAppointment.technician?.email) && (
                  <a
                    href={`mailto:${
                      user?.role === 'technician'
                        ? selectedAppointment.owner?.email
                        : selectedAppointment.technician?.email
                    }`}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    title="Email"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Reschedule Form Toggle */}
            {isRescheduling ? (
              <form onSubmit={handleRescheduleSubmit} className="space-y-4 p-4 rounded-xl border border-purple-200 bg-purple-50/40">
                <h4 className="text-sm font-bold text-purple-950">Pick New Date & Time Slot</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">New Date</label>
                    <input
                      type="date"
                      required
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="input text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        required
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                        className="input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">End Time</label>
                      <input
                        type="time"
                        required
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        className="input text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRescheduling(false)}
                    className="btn-secondary btn-sm text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rescheduleMutation.isPending}
                    className="btn-primary btn-sm text-xs font-bold"
                  >
                    {rescheduleMutation.isPending ? 'Saving...' : 'Confirm New Time'}
                  </button>
                </div>
              </form>
            ) : null}

            {/* Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
              {selectedAppointment.repairRequest?._id && (
                <Link
                  to={`/repair-requests/${selectedAppointment.repairRequest._id}`}
                  className="btn-secondary btn-sm text-xs flex items-center gap-1 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Repair Request</span>
                </Link>
              )}

              <div className="flex items-center gap-2 ml-auto">
                {selectedAppointment.status !== 'cancelled' &&
                  selectedAppointment.status !== 'completed' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to cancel this appointment?')) {
                            cancelMutation.mutate({
                              id: selectedAppointment._id,
                              reason: 'Cancelled by user',
                            });
                          }
                        }}
                        disabled={cancelMutation.isPending}
                        className="btn-secondary btn-sm text-xs text-red-600 hover:text-red-700 hover:border-red-200"
                      >
                        Cancel Slot
                      </button>

                      {!isRescheduling && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsRescheduling(true);
                            if (selectedAppointment.scheduledStart) {
                              setNewStartDate(format(parseISO(selectedAppointment.scheduledStart), 'yyyy-MM-dd'));
                            }
                          }}
                          className="btn-secondary btn-sm text-xs font-bold"
                        >
                          Reschedule
                        </button>
                      )}

                      {user?.role === 'technician' && (
                        <button
                          type="button"
                          onClick={() =>
                            statusMutation.mutate({
                              id: selectedAppointment._id,
                              status: 'completed',
                            })
                          }
                          disabled={statusMutation.isPending}
                          className="btn-primary btn-sm text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Mark Completed
                        </button>
                      )}
                    </>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
