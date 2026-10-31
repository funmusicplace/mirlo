import api from "services/api";

export const testOwnership = async (trackGroupId: number) => {
  try {
    const response = await api.get<{ exists: boolean }>(
      `trackGroups/${trackGroupId}/testOwns`
    );
    return response.result.exists;
  } catch (e) {
    return false;
  }
};
