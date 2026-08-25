/**
 * Reusable card skeleton for loading states in list views.
 */
export default function CardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gray-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gray-200 rounded w-2/5" />
                <div className="h-5 bg-gray-100 rounded-full w-16" />
              </div>
              <div className="h-3 bg-gray-100 rounded w-4/5" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
            <div className="w-4 h-4 bg-gray-100 rounded shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
