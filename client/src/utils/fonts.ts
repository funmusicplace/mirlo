export const ensureFontFaces = (font: Font) => {
  const fileIds = font.files.map((file) => file.id).join(" ");
  const existing = document.head.querySelector<HTMLStyleElement>(
    `style[data-font-id="${font.id}"]`
  );
  if (existing?.dataset.fontFiles === fileIds) {
    return;
  }
  const style = existing ?? document.createElement("style");
  style.dataset.fontId = font.id;
  style.dataset.fontFiles = fileIds;
  style.textContent = font.css;
  if (!existing) {
    document.head.append(style);
  }
};

export const applyFontVariable = (name: string, font: Font | null) => {
  const { style } = document.documentElement;
  if (font) {
    ensureFontFaces(font);
    style.setProperty(name, font.stack);
  } else {
    style.setProperty(name, "initial");
  }
};
