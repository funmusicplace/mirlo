import { css } from "@emotion/css";
import React from "react";
import { Controller } from "react-hook-form";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";

import { isWidgetUrl } from "utils/tracks";

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "list",
  "bullet",
  "indent",
  "link",
  "image",
  "video",
  "mirlo",
];

const TextEditor: React.FC<{ name: string }> = ({ name }) => {
  const quillRef = React.useRef<ReactQuill>();

  const modules = React.useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, false] }],
          ["bold", "italic", "underline", "strike", "blockquote"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image", "video", "mirlo"],
        ],
        handlers: {
          mirlo: (value: unknown) => {
            if (value) {
              var url = prompt("Enter the link for the track");
              const quill = quillRef.current?.getEditor();
              if (quill && url && isWidgetUrl(url)) {
                let range = quill.getSelection(true);
                quill.insertText(range.index, "\n", Quill.sources.USER);

                quill.insertEmbed(
                  range.index + 1,
                  "video",
                  url,
                  Quill.sources.USER
                );

                quill.formatText(
                  { index: range.index + 1, length: range.length },
                  "1",
                  {
                    height: "154",
                    width: "400",
                  }
                );
                quill.setSelection(range.index + 2, Quill.sources.SILENT);
              }
            }
          },
        },
      },
    }),
    []
  );

  return (
    <Controller
      name={name}
      render={({ field: { onChange, value, ref } }) => {
        return (
          <ReactQuill
            ref={(el) => {
              quillRef.current = el ?? undefined;
            }}
            value={value}
            className={css`
              width: 100%;
              margin-bottom: 3.5rem;

              button.ql-mirlo {
                &:after {
                  content: "\\25B6";
                  display: block;
                }
              }
              .ql-container {
                background: var(--mi-lighten-x-background-color);
                font-size: 1.2rem;
                min-height: 300px;
              }

              iframe.ql-video {
                width: 700px;
                height: 394px;
              }

              iframe[src*="widget/track"].ql-video {
                width: 700px;
                height: 154px;
              }
            `}
            theme="snow"
            onChange={onChange}
            modules={modules}
            formats={formats}
          />
        );
      }}
    />
  );
};

export default TextEditor;
