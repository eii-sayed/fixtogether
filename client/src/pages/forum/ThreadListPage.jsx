import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { forumApi } from "../../api/forumApi";
import { ThreadCard } from "../../components/forum/ForumComponents";

const categories = [
  "",
  "Repair Help",
  "Technician Recommendation",
  "Parts Recommendation",
  "Donation Advice",
  "Recycling Advice",
  "DIY Projects",
  "Success Stories",
  "Buying Advice",
  "General Discussion",
];
export default function ThreadListPage({ embedded = false, mine = false }) {
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    sort: "recent",
    page: 1,
    ...(mine ? { mine: true } : {}),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["forum-threads", filters],
    queryFn: () => forumApi.list({ ...filters, limit: 12 }),
    staleTime: 30000,
  });
  const update = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  return (
    <section
      className={embedded ? "" : "page-container max-w-5xl px-3 sm:px-6 py-8"}
    >
      {!embedded && (
        <h1 className="mb-6 text-3xl font-black text-gray-900">
          Community Forum
        </h1>
      )}
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-10 w-full"
            placeholder="Search discussions"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
          />
        </div>
        <select
          className="input sm:w-56"
          value={filters.category}
          onChange={(e) => update("category", e.target.value)}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category || "All categories"}
            </option>
          ))}
        </select>
        <select
          className="input sm:w-40"
          value={filters.sort}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="recent">Most recent</option>
          <option value="viewed">Most viewed</option>
          <option value="liked">Most liked</option>
        </select>
      </div>
      {isLoading ? (
        <div className="py-12 text-center text-gray-500">
          Loading discussions...
        </div>
      ) : (
        <div className="space-y-3">
          {data?.threads?.map((thread) => (
            <ThreadCard key={thread._id} thread={thread} />
          ))}
          {!data?.threads?.length && (
            <div className="card p-10 text-center text-gray-500">
              <SlidersHorizontal className="mx-auto mb-3" />
              No discussions match these filters.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
