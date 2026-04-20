export const getSafeErrorContext = (error: unknown) => {
  if (error instanceof Error) {
    const errorWithExtras = error as Error & {
      code?: string;
      command?: { name?: string; args?: unknown[] };
    };

    return {
      name: errorWithExtras.name,
      message: errorWithExtras.message,
      code: errorWithExtras.code,
      stack: errorWithExtras.stack?.split("\n").slice(0, 8).join("\n"),
      command: errorWithExtras.command
        ? {
            name: errorWithExtras.command.name,
            argsCount: Array.isArray(errorWithExtras.command.args)
              ? errorWithExtras.command.args.length
              : undefined,
          }
        : undefined,
    };
  }

  return {
    message: String(error),
  };
};
