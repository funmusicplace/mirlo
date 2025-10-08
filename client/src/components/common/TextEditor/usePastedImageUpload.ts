import { useCallback, useEffect, useRef } from "react";
import { prosemirrorNodeToHtml } from "@remirror/core-utils";

import api from "services/api";

export type UsePastedImageUploadArgs = {
  manager: { view: any };
  postId?: number;
  reloadImages?: () => void;
  setState: (state: Readonly<EditorState>) => void;
  onChange: (html: string) => void;
};

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const dataUriToFile = async (dataUri: string, index: number): Promise<File> => {
  const response = await fetch(dataUri);
  const blob = await response.blob();

  const mimeFromBlob = blob.type;
  const mimeFromUri = dataUri.match(/^data:(.*?)(;|,)/)?.[1];
  const mimeType = mimeFromBlob || mimeFromUri || "application/octet-stream";

  const fallbackExtension = mimeType.includes("/")
    ? mimeType.split("/")[1]?.split("+")[0]
    : undefined;
  const extension = EXTENSION_MAP[mimeType] ?? fallbackExtension ?? "bin";

  return new File([blob], `pasted-image-${Date.now()}-${index}.${extension}`, {
    type: mimeType,
  });
};

const imageWithSrcExists = (manager: { view: any }, src: string): boolean => {
  const view = manager.view;
  if (!view) {
    return false;
  }

  let found = false;
  view.state.doc.descendants((node: any) => {
    if (found || node.type.name !== "image") {
      return;
    }

    const nodeSrc: unknown = node.attrs.src;
    if (typeof nodeSrc === "string" && nodeSrc === src) {
      found = true;
    }
  });

  return found;
};

export const usePastedImageUpload = ({
  manager,
  postId,
  reloadImages,
  setState,
  onChange,
}: UsePastedImageUploadArgs) => {
  const processedPastedImagesRef = useRef<Map<string, string>>(new Map());
  const uploadingPastedImagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    processedPastedImagesRef.current.clear();
    uploadingPastedImagesRef.current.clear();
  }, [postId]);

  const replaceImageSources = useCallback(
    (replacements: Map<string, string>) => {
      const view = manager.view;
      if (!view || replacements.size === 0) {
        return;
      }

      const { state } = view;
      let tr = state.tr;
      let hasChanges = false;

      state.doc.descendants((node: any, pos: number) => {
        if (node.type.name !== "image") {
          return;
        }

        const src: unknown = node.attrs.src;
        if (typeof src !== "string") {
          return;
        }

        const replacement = replacements.get(src);
        if (!replacement) {
          return;
        }

        tr = tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          src: replacement,
        });
        hasChanges = true;
      });

      if (hasChanges) {
        view.dispatch(tr);

        const updatedView = manager.view;
        if (!updatedView) {
          return;
        }

        const html = prosemirrorNodeToHtml((updatedView.state as any).doc);
        setState(updatedView.state as any);
        onChange(html);
      }
    },
    [manager, onChange, setState]
  );

  const uploadPastedImages = useCallback(async () => {
    if (!postId) {
      return;
    }

    const view = manager.view;
    if (!view) {
      return;
    }

    const dataUriSrcs: string[] = [];
    view.state.doc.descendants((node: any) => {
      if (node.type.name !== "image") {
        return;
      }

      const src: unknown = node.attrs.src;
      if (typeof src === "string" && src.startsWith("data:image")) {
        dataUriSrcs.push(src);
      }
    });

    if (dataUriSrcs.length === 0) {
      return;
    }

    const replacements = new Map<string, string>();
    let shouldReloadImages = false;

    for (const [index, src] of Array.from(new Set(dataUriSrcs)).entries()) {
      if (!imageWithSrcExists(manager, src)) {
        continue;
      }

      const cachedResult = processedPastedImagesRef.current.get(src);
      if (cachedResult) {
        replacements.set(src, cachedResult);
        continue;
      }

      if (uploadingPastedImagesRef.current.has(src)) {
        continue;
      }

      try {
        uploadingPastedImagesRef.current.add(src);
        const file = await dataUriToFile(src, index);
        const response = await api.uploadFile(
          `manage/posts/${postId}/images`,
          [file]
        );

        if (!imageWithSrcExists(manager, src)) {
          processedPastedImagesRef.current.delete(src);
          continue;
        }

        processedPastedImagesRef.current.set(src, response.result.jobId);
        replacements.set(src, response.result.jobId);
        shouldReloadImages = true;
      } catch (error) {
        console.error("Failed to upload pasted image", error);
        processedPastedImagesRef.current.delete(src);
      } finally {
        uploadingPastedImagesRef.current.delete(src);
      }
    }

    if (replacements.size > 0) {
      replaceImageSources(replacements);

      if (shouldReloadImages) {
        reloadImages?.();
      }
    }
  }, [manager, onChange, postId, reloadImages, replaceImageSources, setState]);

  useEffect(() => {
    const view = manager.view;
    if (!view) {
      return;
    }

    const handlePaste = () => {
      window.setTimeout(() => {
        void uploadPastedImages();
      }, 0);
    };

    view.dom.addEventListener("paste", handlePaste);

    return () => {
      view.dom.removeEventListener("paste", handlePaste);
    };
  }, [manager, uploadPastedImages]);

  return uploadPastedImages;
};

export type { UsePastedImageUploadArgs as UsePastedImageUploadOptions };
