import { useQuery } from "@tanstack/react-query";
import { forumApi } from "../../api/forumApi";
import { ThreadCard } from "../../components/forum/ForumComponents";
export default function BookmarkedThreadsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["forum-bookmarks"],
    queryFn: forumApi.bookmarks,
  });
  return (
    <div className="page-container max-w-5xl px-3 sm:px-6 py-8">
      <h1 className="text-3xl font-black text-gray-900">Saved discussions</h1>
      <div className="mt-6 space-y-3">
        {isLoading
          ? "Loading..."
          : data?.threads?.map((thread) => (
              <ThreadCard key={thread._id} thread={thread} />
            ))}
      </div>
    </div>
  );
}
