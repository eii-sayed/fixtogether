import api from "./axios";

export const forumApi = {
  list: (params) =>
    api.get("/forum/threads", { params }).then((r) => r.data.data),
  get: (id) => api.get(`/forum/threads/${id}`).then((r) => r.data.data),
  create: (data) =>
    api
      .post("/forum/threads", data, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.data),
  update: (id, data) =>
    api
      .put(`/forum/threads/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.data),
  remove: (id) => api.delete(`/forum/threads/${id}`),
  reply: (id, data) =>
    api
      .post(`/forum/threads/${id}/replies`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.data),
  removeReply: (id) => api.delete(`/forum/replies/${id}`),
  likeThread: (id) =>
    api.post(`/forum/threads/${id}/like`).then((r) => r.data.data),
  likeReply: (id) =>
    api.post(`/forum/replies/${id}/like`).then((r) => r.data.data),
  bookmark: (id) =>
    api.post(`/forum/threads/${id}/bookmark`).then((r) => r.data.data),
  accept: (id) =>
    api.post(`/forum/replies/${id}/accept`).then((r) => r.data.data),
  report: (data) => api.post("/forum/report", data),
  bookmarks: () => api.get("/forum/bookmarks").then((r) => r.data.data),
  reports: () => api.get("/forum/reports").then((r) => r.data.data),
  lock: (id) => api.post(`/forum/threads/${id}/lock`).then((r) => r.data.data),
  review: (id, data) =>
    api.post(`/forum/reports/${id}/review`, data).then((r) => r.data.data),
};

export const toFormData = (values) => {
  const form = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (key === "images") value.forEach((file) => form.append("images", file));
    else if (Array.isArray(value)) form.append(key, value.join(","));
    else if (value !== undefined && value !== null) form.append(key, value);
  });
  return form;
};
