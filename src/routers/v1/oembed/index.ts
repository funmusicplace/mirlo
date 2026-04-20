import { NextFunction, Request, Response } from "express";
import { AppError } from "../../../utils/error";
import logger from "../../../logger";
import { getClient } from "../../../activityPub/utils";
import { matchRoute } from "../../../parseIndex/routeMatcher";
import {
  fetchArtistMetadata,
  fetchAlbumMetadata,
  fetchPostMetadata,
  fetchMerchMetadata,
} from "../../../parseIndex/metadata";
import { generateFullStaticImageUrl } from "../../../utils/images";
import {
  finalCoversBucket,
  finalMerchImageBucket,
  finalPostImageBucket,
  finalArtistAvatarBucket,
} from "../../../utils/minio";

interface oEmbedResponse {
  type: "rich" | "photo" | "link";
  html?: string;
  width: number;
  height: number;
  title: string;
  author_name: string;
  author_url?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  cache_age?: number;
}

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { url: urlParam, format = "json" } = req.query as {
      url: string | string[];
      format?: string | string[];
    };

    // Handle url parameter that may come as array (when sent multiple times)
    const url = Array.isArray(urlParam) ? urlParam[0] : urlParam;
    const formatStr = Array.isArray(format) ? format[0] : format;

    try {
      if (formatStr !== "json") {
        throw new AppError({
          httpCode: 400,
          description: "We only support json oEmbed requests for now",
        });
      }

      if (!url) {
        throw new AppError({
          httpCode: 400,
          description: "URL parameter is required",
        });
      }

      const client = await getClient();
      let oembedData: oEmbedResponse | null = null;

      // Parse URL and extract path
      const urlObj = new URL(url, client.applicationUrl);
      const pathSegments = urlObj.pathname.split("/").filter(Boolean);

      // Match against shared route patterns
      const routeParams = matchRoute(pathSegments);

      if (!routeParams) {
        throw new AppError({
          httpCode: 404,
          description: "Content not found",
        });
      }

      const routeType = routeParams.type as string;

      if (routeType === "album") {
        // Album detail
        const artistSlug = routeParams.artistSlug as string | undefined;
        const albumSlug = routeParams.albumSlug as string | undefined;
        if (artistSlug && albumSlug) {
          const album = await fetchAlbumMetadata(artistSlug, albumSlug);
          if (album) {
            const coverUrl = album.cover?.url.find((u) => u.includes("x600"));
            const releaseDate =
              album.releaseDate?.toISOString().split("T")[0] || "";
            oembedData = {
              type: "rich",
              html: `<iframe src="${client.applicationUrl}/widget/trackGroup/${album.id}" width="400" height="140" frameborder="0" allow="autoplay"></iframe>`,
              width: 400,
              height: 140,
              title: `${album.title} by ${album.artist.name}`,
              author_name: album.artist.name,
              author_url: `${client.applicationUrl}/${album.artist.urlSlug}`,
              thumbnail_url: coverUrl
                ? generateFullStaticImageUrl(coverUrl, finalCoversBucket)
                : undefined,
              thumbnail_width: 300,
              thumbnail_height: 300,
              cache_age: 86400,
            };
          }
        }
      } else if (routeType === "track") {
        // Track detail
        const artistSlug = routeParams.artistSlug as string | undefined;
        const albumSlug = routeParams.albumSlug as string | undefined;
        const trackId = routeParams.trackId as number | undefined;
        if (artistSlug && albumSlug && trackId) {
          const album = await fetchAlbumMetadata(artistSlug, albumSlug);
          if (album) {
            const track = album.tracks.find((t) => t.id === trackId);
            if (track) {
              const coverUrl = album.cover?.url.find((u) => u.includes("x600"));
              oembedData = {
                type: "rich",
                html: `<iframe src="${client.applicationUrl}/widget/track/${track.id}" width="400" height="140" frameborder="0" allow="autoplay"></iframe>`,
                width: 400,
                height: 140,
                title: `${track.title} by ${album.artist.name}`,
                author_name: album.artist.name,
                author_url: `${client.applicationUrl}/${album.artist.urlSlug}`,
                thumbnail_url: coverUrl
                  ? generateFullStaticImageUrl(coverUrl, finalCoversBucket)
                  : undefined,
                thumbnail_width: 300,
                thumbnail_height: 300,
                cache_age: 86400,
              };
            }
          }
        }
      } else if (routeType === "post") {
        // Post detail
        const artistSlug = routeParams.artistSlug as string | undefined;
        const postId = routeParams.postId as number | undefined;
        const postSlug = routeParams.postSlug as string | undefined;

        if (artistSlug) {
          const post = postId
            ? await fetchPostMetadata(artistSlug, { id: postId })
            : postSlug
              ? await fetchPostMetadata(artistSlug, { slug: postSlug })
              : null;

          if (post) {
            let imageUrl = post.featuredImage
              ? generateFullStaticImageUrl(
                  post.featuredImage.id,
                  finalPostImageBucket,
                  post.featuredImage.extension
                )
              : undefined;

            oembedData = {
              type: "rich",
              html: `<a href="${client.applicationUrl}/${post.artist?.urlSlug}/posts/${post.id}">${post.title}</a>`,
              width: 400,
              height: 300,
              title: post.title,
              author_name: post.artist?.name || "Mirlo Artist",
              author_url: `${client.applicationUrl}/${post.artist?.urlSlug}`,
              thumbnail_url: imageUrl,
              thumbnail_width: 400,
              thumbnail_height: 300,
              cache_age: 86400,
            };
          }
        }
      } else if (routeType === "merch") {
        // Merch detail
        const artistSlug = routeParams.artistSlug as string | undefined;
        const merchId = routeParams.merchId as string | undefined;

        if (artistSlug && merchId) {
          // Try to fetch by ID first, then by slug if it fails
          let merch = null;
          try {
            merch = await fetchMerchMetadata(artistSlug, { id: merchId });
          } catch {
            // ID format invalid (not a UUID), try by slug
            merch = await fetchMerchMetadata(artistSlug, { slug: merchId });
          }

          if (merch) {
            const coverUrl = merch.images?.[0]?.url.find((u) =>
              u.includes("x600")
            );
            oembedData = {
              type: "rich",
              html: `<a href="${client.applicationUrl}/${merch.artist?.urlSlug}/merch/${merch.id}">${merch.title}</a>`,
              width: 400,
              height: 300,
              title: merch.title,
              author_name: merch.artist?.name || "Mirlo Artist",
              author_url: `${client.applicationUrl}/${merch.artist?.urlSlug}`,
              thumbnail_url: coverUrl
                ? generateFullStaticImageUrl(coverUrl, finalMerchImageBucket)
                : undefined,
              thumbnail_width: 300,
              thumbnail_height: 300,
              cache_age: 86400,
            };
          }
        }
      } else if (routeType === "artist") {
        // Artist profile
        const artistSlug = routeParams.artistSlug as string | undefined;
        if (artistSlug) {
          const artist = await fetchArtistMetadata(artistSlug);
          if (artist) {
            const avatarUrl = artist.avatar?.url.find((u) =>
              u.includes("x600")
            );
            oembedData = {
              type: "link",
              width: 400,
              height: 300,
              title: artist.name || "Mirlo Artist",
              author_name: artist.name || "Mirlo Artist",
              author_url: `${client.applicationUrl}/${artist.urlSlug}`,
              thumbnail_url: avatarUrl
                ? generateFullStaticImageUrl(avatarUrl, finalArtistAvatarBucket)
                : undefined,
              thumbnail_width: 300,
              thumbnail_height: 300,
              cache_age: 86400,
            };
          }
        }
      }

      if (!oembedData) {
        throw new AppError({
          httpCode: 404,
          description: "Content not found",
        });
      }

      res.json(oembedData);
    } catch (error) {
      if (error instanceof AppError) {
        const message = `oEmbed request failed: ${error.description}`;
        const context = {
          path: req.path,
          url: req.query?.url,
          httpCode: error.httpCode,
        };

        if (error.httpCode === 404) {
          logger.info(message, context);
        } else if (error.httpCode >= 400 && error.httpCode < 500) {
          logger.warn(message, context);
        } else {
          logger.error(message, context);
        }
      } else {
        logger.error("Error in oEmbed endpoint:", error);
      }
      next(error);
    }
  }

  GET.apiDoc = {
    summary: "oEmbed endpoint for Mirlo content",
    description:
      "Provides oEmbed responses for embeddable Mirlo content (albums, posts, merch, and artist profiles)",
    parameters: [
      {
        in: "query",
        name: "url",
        required: true,
        type: "string",
        collectionFormat: "multi",
        description: "The Mirlo URL to get embedding information for",
      },
      {
        in: "query",
        name: "format",
        type: "string",
        enum: ["json"],
        default: "json",
        collectionFormat: "multi",
        description: "The required response format (json only)",
      },
    ],
    responses: {
      200: {
        description: "oEmbed response",
        schema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["rich", "photo", "link"] },
            html: { type: "string" },
            width: { type: "integer" },
            height: { type: "integer" },
            title: { type: "string" },
            author_name: { type: "string" },
            author_url: { type: "string" },
            thumbnail_url: { type: "string" },
            cache_age: { type: "integer" },
          },
        },
      },
      400: { description: "Invalid parameters" },
      404: { description: "Content not found" },
    },
  };

  return operations;
}
