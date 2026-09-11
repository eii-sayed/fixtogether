import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { forumApi, toFormData } from "../../api/forumApi";

const categories = [
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
export default function CreateThreadPage({ edit = false, initial = null }) {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    category: initial?.category || categories[0],
    itemType: initial?.itemType || "",
    tags: initial?.tags?.join(", ") || "",
    location: initial?.location || "",
    images: [],
  });
  const mutation = useMutation({
    mutationFn: (data) =>
      edit ? forumApi.update(initial._id, data) : forumApi.create(data),
    onSuccess: (data) => navigate(`/forum/threads/${data.thread._id}`),
  });
  const change = (key, value) =>
    setValues((current) => ({ ...current, [key]: value }));
  return (
    <div className="page-container max-w-3xl px-3 sm:px-6 py-8">
      <h1 className="text-3xl font-black text-gray-900">
        {edit ? "Edit discussion" : "Start a discussion"}
      </h1>
      <p className="mt-2 text-gray-600">
        Give the community enough context to offer useful advice.
      </p>
      <form
        className="card mt-6 space-y-5 p-5 sm:p-7"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(
            toFormData({
              ...values,
              tags: values.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            }),
          );
        }}
      >
        <label className="block text-sm font-semibold">
          Title
          <input
            className="input mt-2 w-full"
            required
            minLength="8"
            value={values.title}
            onChange={(e) => change("title", e.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold">
          Category
          <select
            className="input mt-2 w-full"
            value={values.category}
            onChange={(e) => change("category", e.target.value)}
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Description
          <textarea
            className="input mt-2 min-h-40 w-full"
            required
            minLength="20"
            value={values.description}
            onChange={(e) => change("description", e.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Item type
            <input
              className="input mt-2 w-full"
              value={values.itemType}
              onChange={(e) => change("itemType", e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            Location
            <input
              className="input mt-2 w-full"
              value={values.location}
              onChange={(e) => change("location", e.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm font-semibold">
          Tags
          <span className="mt-1 block text-xs font-normal text-gray-500">
            Separate tags with commas
          </span>
          <input
            className="input mt-2 w-full"
            value={values.tags}
            onChange={(e) => change("tags", e.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold">
          Images
          <input
            className="input mt-2 w-full"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => change("images", Array.from(e.target.files || []))}
          />
        </label>
        {mutation.isError && (
          <p className="text-sm text-red-600">
            {mutation.error.response?.data?.message ||
              "Unable to save discussion."}
          </p>
        )}
        <button
          disabled={mutation.isPending}
          className="btn-primary w-full justify-center"
        >
          {mutation.isPending
            ? "Saving..."
            : edit
              ? "Save changes"
              : "Publish discussion"}
        </button>
      </form>
    </div>
  );
}
