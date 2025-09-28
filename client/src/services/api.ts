import { API_ROOT } from "../constants";
// import APIInstance from "@mirlo/mirlo-api-client";
import APIInstance from "./APIInstance";

const api = APIInstance(
  API_ROOT?.replace(" ", "") ?? "",
  import.meta.env.VITE_MIRLO_API_KEY
);

export default api;
