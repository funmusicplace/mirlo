import api from "services/api";

export const testOwnership = async (trackGroupId: number, email: string) => {
  try {
    const response = await api.get<{ exists: boolean }>(
      `trackGroups/${trackGroupId}/testOwns?email=${email.toLowerCase()}`
    );
    return response.result.exists;
  } catch (e) {
    return false;
  }
};
