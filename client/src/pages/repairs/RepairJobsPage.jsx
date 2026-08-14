import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { PageLoader, ErrorState, EmptyState, StatusBadge, Pagination } from '../../components/ui';
import { Wrench, ArrowRight, Calendar, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import WriteReviewModal from '../../components/reviews/WriteReviewModal';

export default function RepairJobsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [reviewJob, setReviewJob] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['repair-jobs', page, status],
    queryFn: () => api.get(`/repair-jobs?page=${page}&limit=12${status ? `&status=${status}` : ''}`).then(r => r.data.data),
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  const statuses = ['', 'pending_inspection', 'inspecting', 'in_progress', 'waiting_for_parts', 'completed', 'disputed'];

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Repair Jobs</h1>
        <p className="text-sm text-gray-500 mt-1">Track your active and completed repair jobs</p>
      </div>

      <div className="flex gap-1 flex-wrap mb-6">
        {statuses.map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${status === s ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s ? s.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      {data?.repairJobs?.length === 0 ? (
        <EmptyState icon={Wrench} title="No repair jobs" description="Repair jobs appear after a quotation is accepted." />
      ) : (
        <div className="space-y-3">
          {data?.repairJobs?.map((job) => (
            <div key={job._id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:shadow-md transition-shadow group">
              <Link to={`/repair-requests/${job.repairRequest?._id}`} className="flex-1 min-w-0 flex items-start gap-4 cursor-pointer">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                  <Wrench className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 hover:text-primary-600 transition-colors">Job #{job._id.slice(-6)}</h3>
                    <StatusBadge status={job.currentStatus} />
                  </div>
                  <p className="text-xs text-gray-500">
                    Owner: {job.owner?.fullName} • Tech: {job.technician?.fullName}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" /> {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
              
              <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                {job.currentStatus === 'completed' && job.ownerAcceptedCompletion && user?.role === 'owner' && (
                  <button 
                    onClick={(e) => { e.preventDefault(); setReviewJob(job); }}
                    className="btn-primary py-1.5 px-3 text-xs whitespace-nowrap flex items-center gap-1"
                  >
                    <Star className="w-3 h-3" /> Write Review
                  </button>
                )}
                <Link to={`/repair-requests/${job.repairRequest?._id}`} className="hidden sm:block">
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" />
                </Link>
              </div>
            </div>
          ))}
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </div>
      )}

      {reviewJob && (
        <WriteReviewModal 
          open={!!reviewJob}
          onClose={() => setReviewJob(null)}
          repairJobId={reviewJob._id}
          technicianName={reviewJob.technician?.fullName}
        />
      )}
    </div>
  );
}
