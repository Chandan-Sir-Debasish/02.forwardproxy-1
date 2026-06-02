import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export const blocklistAPI = {
  get: () => api.get("/blocklist"),
  add: (domain) => api.post("/blocklist", { domain }),
  delete: (id) => api.delete(`/blocklist/${id}`),
};

export const logsAPI = {
  get: (limit = 100) => api.get(`/logs?limit=${limit}`),
};

export const statsAPI = {
  get: () => api.get("/stats"),
};
