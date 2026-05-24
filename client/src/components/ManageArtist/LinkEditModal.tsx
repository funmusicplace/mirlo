import { ArtistButton } from "components/Artist/ArtistButtons";
import Button from "components/common/Button";
import { outsideLinks } from "components/common/LinkIconDisplay";
import Modal from "components/common/Modal";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaSave, FaTimes, FaTrash } from "react-icons/fa";

import LinkFormFields from "./LinkFormFields";

const sanitizeLink = (link: Link): Link => {
  const trimmedLinkType = link.linkType?.trim();
  const matchingSite = trimmedLinkType
    ? outsideLinks.find((site) => site.name === trimmedLinkType)
    : undefined;
  const allowsCustomIcon = !matchingSite || matchingSite.isFallback;
  const sanitizedIconUrl = link.iconUrl?.trim();

  const sanitized: Link = {
    ...link,
    linkType: trimmedLinkType ?? "",
  };

  if (allowsCustomIcon && sanitizedIconUrl) {
    sanitized.iconUrl = sanitizedIconUrl;
  } else {
    delete sanitized.iconUrl;
  }

  return sanitized;
};

const emptyLink: Link = {
  url: "",
  linkType: "",
  linkLabel: "",
  inHeader: true,
  iconUrl: undefined,
};

interface LinkEditModalProps {
  open: boolean;
  link?: Link;
  onClose: () => void;
  onSave: (link: Link) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

const LinkEditModal: React.FC<LinkEditModalProps> = ({
  open,
  link,
  onClose,
  onSave,
  onDelete,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const isEditing = !!link;

  const methods = useForm<Link>({
    values: link ?? emptyLink,
  });

  const handleSave = async (data: Link) => {
    await onSave(sanitizeLink(data));
    onClose();
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete();
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="small"
      title={t(isEditing ? "editLink" : "addNewLink")}
    >
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(handleSave)}>
          <LinkFormFields />
          <div className="flex flex-wrap justify-end gap-2 mt-6">
            {isEditing && onDelete && (
              <ArtistButton
                wrap
                size="compact"
                variant="dashed"
                buttonRole="warning"
                type="button"
                startIcon={<FaTrash />}
                onClick={handleDelete}
                className="mr-auto"
              >
                {t("deleteLink")}
              </ArtistButton>
            )}
            <Button
              wrap
              size="compact"
              variant="transparent"
              type="button"
              startIcon={<FaTimes />}
              onClick={onClose}
            >
              {t("cancel")}
            </Button>
            <ArtistButton
              wrap
              size="compact"
              type="submit"
              startIcon={<FaSave />}
            >
              {t(isEditing ? "saveLink" : "addLink")}
            </ArtistButton>
          </div>
        </form>
      </FormProvider>
    </Modal>
  );
};

export default LinkEditModal;
