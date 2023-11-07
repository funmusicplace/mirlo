import React from "react";
import api from "services/api";

const useJobStatusCheck = ({
  reload,
  reset,
}: {
  reload: () => void;
  reset?: () => void;
}) => {
  const [uploadJobs, setUploadJobs] = React.useState<
    { jobId: string; jobStatus: string }[]
  >([]);

  React.useEffect(() => {
    let timer: NodeJS.Timer | undefined;
    if (uploadJobs.length > 0) {
      timer = setInterval(async () => {
        const result = await api.getMany<{ jobStatus: string; jobId: string }>(
          `jobs?${uploadJobs.map((job) => `ids=${job.jobId}&`).join("")}`
        );

        if (
          result.results.some(
            (r) => r.jobStatus !== "completed" && r.jobStatus !== "unknown"
          )
        ) {
          setUploadJobs(result.results);
        } else {
          setUploadJobs([]);
          await reload();
          reset?.();
        }
      }, 5000);
    }
    return () => clearInterval(timer);
  }, [reload, uploadJobs, reset]);

  return {
    uploadJobs,
    setUploadJobs,
  };
};

export default useJobStatusCheck;
