import api from "services/api";

export const testOwnership = async (trackGroupId: number, email: string) => {
  try {
    const query = new URLSearchParams({ email: email.toLowerCase() });
    const response = await api.get<{ exists: boolean }>(
      `trackGroups/${trackGroupId}/testOwns?${query.toString()}`
    );
    return response.result.exists;
  } catch (e) {
    return false;
  }
};
