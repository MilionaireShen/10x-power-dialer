import api from "./api";

const dispositionService = {
  list: () => api.get("/dispositions").then((r) => r.data),
};

export default dispositionService;
