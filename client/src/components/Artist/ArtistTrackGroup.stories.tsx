import type { Meta, StoryObj } from "@storybook/react";
import ArtistTrackGroup from "./ArtistTrackGroup";
import { TRACK_GROUP_EXAMPLE } from "../../../test/mocks";
import { GlobalStateProvider } from "state/GlobalState";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Artist/ArtistTrackGroup",
  component: (props) => (
    <GlobalStateProvider>
      <ArtistTrackGroup {...props} />
    </GlobalStateProvider>
  ),
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {},
} satisfies Meta<typeof ArtistTrackGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    trackGroup: TRACK_GROUP_EXAMPLE,
  },
};
