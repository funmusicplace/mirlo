import { API_ROOT } from "../constants";
import APIInstance from "./APIInstance";

const api = APIInstance(API_ROOT?.replace(" ", "") ?? "");

export default api;
