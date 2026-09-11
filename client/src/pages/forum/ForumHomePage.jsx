import { Link } from "react-router-dom";
import { MessageSquare, Plus, Bookmark } from "lucide-react";
import ThreadListPage from "./ThreadListPage";

export default function ForumHomePage() {
  return (
    <div className="page-container max-w-6xl px-3 sm:px-6 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary-600">
            FixTogether Community
          </p>
          <h1 className="mt-2 text-3xl font-black text-gray-900">
            Ask. Repair. Reuse.
          </h1>
          <p className="mt-2 text-gray-600">
            Get practical guidance from people who have solved similar problems.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/forum/bookmarks" className="btn-secondary">
            <Bookmark className="w-4 h-4" /> Saved
          </Link>
          <Link to="/forum/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Start a discussion
          </Link>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-[1fr_280px]">
        <ThreadListPage embedded />
        <aside className="card h-fit p-5">
          <MessageSquare className="w-6 h-6 text-primary-600" />
          <h2 className="mt-3 font-bold text-gray-900">Community guidelines</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Share useful details, protect personal information, and keep
            recommendations constructive.
          </p>
        </aside>
      </div>
    </div>
  );
}
