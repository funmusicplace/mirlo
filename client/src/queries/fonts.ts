import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import api from "services/api";

import { queryAdminSettings } from "./admin";
import { queryInstanceSettings } from "./instanceSettings";

const QUERY_KEY_ADMIN_FONTS = "admin-fonts";
const FONTS_ENDPOINT = "admin/settings/fonts";

export const queryFonts = () =>
  queryOptions({
    queryKey: [QUERY_KEY_ADMIN_FONTS],
    queryFn: async () => (await api.getMany<Font>(FONTS_ENDPOINT)).results,
  });

const useFontMutation = <T>(mutationFn: (variables: T) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ADMIN_FONTS] }),
        queryClient.invalidateQueries({
          queryKey: queryAdminSettings().queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: queryInstanceSettings().queryKey,
        }),
      ]),
  });
};

export const useCreateFontMutation = () =>
  useFontMutation((files: File[]) =>
    api.uploadFile<Font>(FONTS_ENDPOINT, files, undefined, "POST")
  );

export const useAddFontFilesMutation = () =>
  useFontMutation(({ fontId, files }: { fontId: string; files: File[] }) =>
    api.uploadFile<Font>(
      `${FONTS_ENDPOINT}/${fontId}/files`,
      files,
      undefined,
      "POST"
    )
  );

export const useDeleteFontMutation = () =>
  useFontMutation(({ fontId }: { fontId: string }) =>
    api.delete(`${FONTS_ENDPOINT}/${fontId}`)
  );

export const useDeleteFontFileMutation = () =>
  useFontMutation(({ fontId, fileId }: { fontId: string; fileId: string }) =>
    api.delete(`${FONTS_ENDPOINT}/${fontId}/files/${fileId}`)
  );
