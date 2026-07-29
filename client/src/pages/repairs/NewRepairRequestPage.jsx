import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';

const schema = z.object({
  itemId: z.string().min(1, 'Please select an item'),
  problemDescription: z.string().min(20, 'Please describe the problem in at least 20 characters').max(5000),
  eventBeforeIssue: z.string().optional(),
  previousRepairAttempts: z.string().optional(),
  budgetMinimum: z.coerce.number().min(0).optional(),
  budgetMaximum: z.coerce.number().min(0).optional(),
  preferredServiceMethod: z.enum(['onsite', 'pickup', 'dropoff', 'remote', '']).optional(),
});

export default function NewRepairRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  const { data: itemsData } = useQuery({
    queryKey: ['my-items-all'],
    queryFn: () => api.get('/items?limit=100').then(r => r.data.data),
  });

  const defaultItem = searchParams.get('item') || '';

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { itemId: defaultItem, preferredServiceMethod: '' },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const { data: resp } = await api.post('/repair-requests', data);
      toast.success('Repair request created!');
      navigate(`/repair-requests/${resp.data.repairRequest._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container max-w-2xl">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Repair Request</h1>

      <div className="card card-body">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="label" htmlFor="itemId">Select Item *</label>
            <select {...register('itemId')} id="itemId" className={`input ${errors.itemId ? 'input-error' : ''}`}>
              <option value="">Choose an item</option>
              {itemsData?.items?.map(item => (
                <option key={item._id} value={item._id}>{item.title}</option>
              ))}
            </select>
            {errors.itemId && <p className="error-text">{errors.itemId.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="problemDescription">Problem Description *</label>
            <textarea {...register('problemDescription')} id="problemDescription" rows={5}
              className={`input resize-y ${errors.problemDescription ? 'input-error' : ''}`}
              placeholder="Describe the problem in detail. Include what happened, when it started, and any symptoms..." />
            {errors.problemDescription && <p className="error-text">{errors.problemDescription.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="eventBeforeIssue">What happened before the issue?</label>
            <textarea {...register('eventBeforeIssue')} id="eventBeforeIssue" rows={3} className="input resize-y"
              placeholder="e.g., Dropped it on the floor, got wet, power surge..." />
          </div>

          <div>
            <label className="label" htmlFor="previousRepairAttempts">Previous repair attempts</label>
            <textarea {...register('previousRepairAttempts')} id="previousRepairAttempts" rows={2} className="input resize-y"
              placeholder="Have you tried fixing this before? What did you do?" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="budgetMinimum">Budget Min (৳)</label>
              <input {...register('budgetMinimum')} type="number" id="budgetMinimum" className="input" placeholder="0" />
            </div>
            <div>
              <label className="label" htmlFor="budgetMaximum">Budget Max (৳)</label>
              <input {...register('budgetMaximum')} type="number" id="budgetMaximum" className="input" placeholder="0" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="preferredServiceMethod">Preferred Service Method</label>
            <select {...register('preferredServiceMethod')} id="preferredServiceMethod" className="input">
              <option value="">No preference</option>
              <option value="onsite">On-site (technician comes to me)</option>
              <option value="pickup">Pickup (technician picks up item)</option>
              <option value="dropoff">Drop-off (I bring to technician)</option>
              <option value="remote">Remote (online guidance)</option>
            </select>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Repair Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
