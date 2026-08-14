import { Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ReviewCard({ review }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{review.reviewer?.fullName || 'Anonymous'}</h4>
          <p className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
            {review.verifiedTransaction && <span className="ml-2 text-primary-600 font-medium">✓ Verified</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-secondary-50 text-secondary-700 px-2.5 py-1 rounded-full">
          <Star className="w-4 h-4 fill-secondary-500 text-secondary-500" />
          <span className="text-sm font-bold">{review.rating}</span>
        </div>
      </div>
      
      {review.reviewText && (
        <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">{review.reviewText}</p>
      )}

      <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
        <div className="text-center">
          <p className="text-xs text-gray-500">Communication</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-sm font-semibold text-gray-800">{review.communicationRating}</span>
            <Star className="w-3 h-3 text-secondary-400 fill-secondary-400" />
          </div>
        </div>
        <div className="text-center border-l border-gray-100">
          <p className="text-xs text-gray-500">Service</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-sm font-semibold text-gray-800">{review.serviceQualityRating}</span>
            <Star className="w-3 h-3 text-secondary-400 fill-secondary-400" />
          </div>
        </div>
        <div className="text-center border-l border-gray-100">
          <p className="text-xs text-gray-500">Value</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-sm font-semibold text-gray-800">{review.valueRating}</span>
            <Star className="w-3 h-3 text-secondary-400 fill-secondary-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
