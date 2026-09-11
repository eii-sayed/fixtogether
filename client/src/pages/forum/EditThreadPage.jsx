import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { forumApi } from "../../api/forumApi";
import CreateThreadPage from "./CreateThreadPage";
export default function EditThreadPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["forum-thread", id],
    queryFn: () => forumApi.get(id),
  });
  return isLoading ? (
    <div className="page-container py-12 text-center">Loading...</div>
  ) : (
    <CreateThreadPage edit initial={data.thread} />
  );
}
