import type { Meta, StoryObj } from "@storybook/react";
import { ButtonAnchor } from "./Button";
import { FaPen, FaTrash } from "react-icons/fa";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/ButtonAnchor",
  component: ButtonAnchor,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    startIcon: {
      control: { type: "boolean" },
      mapping: {
        false: [],
        true: <FaPen />,
      },
    },
    endIcon: {
      control: { type: "boolean" },
      mapping: {
        false: [],
        true: <FaPen />,
      },
    },
    children: {
      control: { type: "text" },
    },
  },
} satisfies Meta<typeof ButtonAnchor>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    startIcon: <FaPen />,
    children: "Edit...",
  },
};

export const IconOnly: Story = {
  args: {
    startIcon: <FaPen />,
    onlyIcon: true,
  },
};

export const Dashed: Story = {
  args: {
    startIcon: <FaPen />,
    children: "Edit...",
    variant: "dashed",
  },
};

export const Uppercase: Story = {
  args: {
    children: "Edit...",
    uppercase: true,
  },
};

export const Link: Story = {
  args: {
    startIcon: <FaPen />,
    children: "Edit...",
    variant: "link",
  },
};

export const Danger: Story = {
  args: {
    startIcon: <FaTrash />,
    children: "Delete",
    buttonRole: "warning",
  },
};
