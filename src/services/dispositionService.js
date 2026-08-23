import api from "./api";
import adminService from "./adminService";

const dispositionService = {
  list: () => api.get("/dispositions").then((r) => r.data),
  // Writes go through the admin routes, which are the ones that check the
  // caller is actually allowed to change a disposition.
  create: adminService.createDisposition,
  update: adminService.updateDisposition,
  remove: adminService.deleteDisposition,
};

export default dispositionService;
