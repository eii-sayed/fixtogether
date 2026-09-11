import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Pencil, Share2, Trash2 } from "lucide-react";
import { forumApi, toFormData } from "../../api/forumApi";
import {
  BookmarkButton,
  LikeButton,
  ReplyCard,
  TechnicianBadge,
  ThreadStats,
} from "../../components/forum/ForumComponents";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";

export default function ThreadDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [content, setContent] = useState("");
  const [links, setLinks] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["forum-thread", id],
    queryFn: () => forumApi.get(id),
  });
  useEffect(() => {
    if (!socket) return undefined;
    socket.emit("forum:join", id);
    const refresh = (payload) => {
      if (!payload?.threadId || payload.threadId === id)
        client.invalidateQueries({ queryKey: ["forum-thread", id] });
    };
    socket.on("forum:reply", refresh);
    return () => {
      socket.emit("forum:leave", id);
      socket.off("forum:reply", refresh);
    };
  }, [socket, id, client]);
  const interaction = (fn) =>
    useMutation({
      mutationFn: fn,
      onSuccess: () =>
        client.invalidateQueries({ queryKey: ["forum-thread", id] }),
    });
  const like = interaction(() => forumApi.likeThread(id));
  const bookmark = interaction(() => forumApi.bookmark(id));
  const reply = useMutation({
    mutationFn: () =>
      forumApi.reply(
        id,
        toFormData({
          content,
          links: links
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          images: [],
        }),
      ),
    onSuccess: () => {
      setContent("");
      setLinks("");
      client.invalidateQueries({ queryKey: ["forum-thread", id] });
    },
  });
  if (isLoading)
    return (
      <div className="page-container py-12 text-center">
        Loading discussion...
      </div>
    );
  const thread = data.thread;
  const isOwner =
    user?.id === thread.author?._id || user?._id === thread.author?._id;
  return (
    <div className="page-container max-w-4xl px-3 sm:px-6 py-8">
      <article className="card p-5 sm:p-8">
        <div className="flex justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
              {thread.category}
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-gray-900">
              {thread.title}
            </h1>
          </div>
          <BookmarkButton
            bookmarked={data.viewer.bookmarked}
            onClick={() => bookmark.mutate()}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span>{thread.author?.fullName}</span>
          <TechnicianBadge role={thread.author?.role} />
          <span>•</span>
          <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
        </div>
        <p className="mt-6 whitespace-pre-wrap text-gray-700 leading-7">
          {thread.description}
        </p>
        {thread.images?.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {thread.images.map((image) => (
              <img
                key={image.url}
                src={image.url}
                alt="Thread attachment"
                className="aspect-square rounded-lg object-cover"
              />
            ))}
          </div>
        )}
        <div className="mt-6 flex items-center gap-5 border-t pt-4">
          <LikeButton
            liked={data.viewer.liked}
            count={thread.likesCount}
            onClick={() => like.mutate()}
          />
          <ThreadStats thread={thread} />
          <button
            className="text-gray-500"
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
          >
            <Share2 className="w-4 h-4" />
          </button>
          {isOwner && (
            <Link to={`/forum/threads/${id}/edit`} className="text-gray-500">
              <Pencil className="w-4 h-4" />
            </Link>
          )}
          <button
            className="text-gray-500"
            onClick={() =>
              forumApi.report({
                targetType: "thread",
                targetId: id,
                reason: "Inappropriate content",
              })
            }
          >
            <span className="text-xs">Report</span>
          </button>
        </div>
      </article>
      <section className="mt-6">
        <h2 className="mb-3 text-xl font-bold text-gray-900">
          Replies ({thread.replyCount})
        </h2>
        <div className="space-y-3">
          {data.replies.map((item) => (
            <ReplyCard
              key={item._id}
              reply={item}
              canAccept={isOwner}
              onLike={() => forumApi.likeReply(item._id)}
              onAccept={() =>
                interaction(() => forumApi.accept(item._id)).mutate()
              }
              onDelete={
                item.author?._id === user?._id
                  ? () =>
                      forumApi
                        .removeReply(item._id)
                        .then(() =>
                          client.invalidateQueries({
                            queryKey: ["forum-thread", id],
                          }),
                        )
                  : null
              }
            />
          ))}
        </div>
      </section>
      <form
        className="card mt-6 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          reply.mutate();
        }}
      >
        <h2 className="font-bold text-gray-900">Add your perspective</h2>
        <textarea
          className="input mt-3 min-h-32 w-full"
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share what you know..."
        />
        <input
          className="input mt-3 w-full"
          value={links}
          onChange={(e) => setLinks(e.target.value)}
          placeholder="External links, separated by commas"
        />
        <button className="btn-primary mt-4" disabled={reply.isPending}>
          Post reply
        </button>
      </form>
    </div>
  );
}
