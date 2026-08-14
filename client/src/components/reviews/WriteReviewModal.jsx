import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import { Loader2, Star, X } from 'lucide-react';

const schema = z.object({
  rating: z.number().min(1, 'Please provide an overall rating').max(5),
  communicationRating: z.number().min(1).max(5),
  serviceQualityRating: z.number().min(1).max(5),
  valueRating: z.number().min(1).max(5),
  reviewText: z.string().max(2000).optional(),
});

export default function WriteReviewModal({ open, onClose, repairJobId, technicianName }) {
  if (!open) return null;

  const queryClient = useQueryClient();
  const [hoverRating, setHoverRating] = useState({ overall: 0, comm: 0, service: 0, value: 0 });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      rating: 0,
      communicationRating: 0,
      serviceQualityRating: 0,
      valueRating: 0,
      reviewText: ''
    }
  });

  const values = watch();

  const mutation = useMutation({
    mutationFn: (data) => api.post(`/repair-jobs/${repairJobId}/reviews`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['repair-jobs']);
      queryClient.invalidateQueries(['repair-job', repairJobId]);
      toast.success('Review submitted successfully!');
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    }
  });

  const StarRating = ({ name, label, size = 'w-6 h-6' }) => (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setValue(name, star)}
            onMouseEnter={() => setHoverRating(prev => ({ ...prev, [name]: star }))}
            onMouseLeave={() => setHoverRating(prev => ({ ...prev, [name]: 0 }))}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star 
              className={`${size} ${
                (hoverRating[name] || values[name]) >= star 
                  ? 'text-yellow-400 fill-yellow-400' 
                  : 'text-gray-200 fill-gray-200'
              }`} 
            />
          </button>
        ))}
      </div>
      {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name].message}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold text-gray-900">Review {technicianName}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center">
            <StarRating name="rating" label="Overall Rating *" size="w-8 h-8" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StarRating name="communicationRating" label="Communication" />
            <StarRating name="serviceQualityRating" label="Service Quality" />
            <StarRating name="valueRating" label="Value for Money" />
          </div>

          <div>
            <label className="label" htmlFor="reviewText">Written Review (Optional)</label>
            <textarea
              {...register('reviewText')}
              id="reviewText"
              rows={4}
              className="input w-full resize-none"
              placeholder="Describe your experience with this technician..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary min-w-[120px]">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
