import React from "react";

const useObjectUrl = (file: File | null | undefined) => {
  const [url, setUrl] = React.useState<string>();

  React.useEffect(() => {
    if (!file) {
      setUrl(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
};

export default useObjectUrl;
