import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { forumApi } from "../../api/forumApi";
export default function ForumModerationPage() {
  const client = useQueryClient();
  const { data } = useQuery({
    queryKey: ["forum-reports"],
    queryFn: forumApi.reports,
  });
  const review = useMutation({
    mutationFn: ({ id, status }) => forumApi.review(id, { status }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["forum-reports"] }),
  });
  return (
    <div className="page-container max-w-5xl px-3 sm:px-6 py-8">
      <h1 className="text-3xl font-black text-gray-900">Forum moderation</h1>
      <div className="mt-6 space-y-3">
        {data?.reports?.map((report) => (
          <div
            key={report._id}
            className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-xs font-bold uppercase text-primary-600">
                {report.targetType}
              </p>
              <p className="mt-1 text-sm text-gray-700">{report.reason}</p>
              <p className="mt-1 text-xs text-gray-500">
                Reported by {report.reporter?.fullName}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn-secondary"
                onClick={() =>
                  review.mutate({ id: report._id, status: "dismissed" })
                }
              >
                Dismiss
              </button>
              <button
                className="btn-primary"
                onClick={() =>
                  review.mutate({ id: report._id, status: "reviewed" })
                }
              >
                Mark reviewed
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
