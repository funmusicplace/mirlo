import React from "react";
import Button from "components/common/Button";
import { useCreateMerchMutation } from "queries";
import { useTranslation } from "react-i18next";
import { FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { once } from "lodash";

interface NewAlbumButtonProps extends React.PropsWithChildren {
  artist: Pick<Artist, "id" | "userId">;
}

export function NewMerchButton(props: NewAlbumButtonProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { mutateAsync: createMerch, isPending } = useCreateMerchMutation();

  const handleClick = React.useCallback(
    once(async () => {
      const newMerch = await createMerch({
        merch: {
          title: "",
          artistId: props.artist.id,
        },
      });

      navigate(
        `/manage/artists/${props.artist.id}/merch/${newMerch.result.id}`
      );
    }),
    []
  );

  return (
    <Button
      compact
      transparent
      startIcon={<FaPlus />}
      variant="dashed"
      collapsible
      isLoading={isPending}
      onClick={handleClick}
    >
      {props.children ?? t("artist.addNewMerch")}
    </Button>
  );
}
