import type { Instrumentation } from "next";

// Server errors as one JSON line on stderr, which the host's log stream collects.
// Only the path is logged (query strings can carry PayPal tokens), and never bodies,
// cookies or headers.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as { name?: string; message?: string; digest?: string };
  console.error(
    JSON.stringify({
      level: "error",
      event: "request_error",
      at: new Date().toISOString(),
      method: request.method,
      path: request.path.split("?")[0],
      route: context.routePath,
      routeType: context.routeType,
      digest: e.digest,
      error: e.name ?? "Error",
      message: (e.message ?? String(err)).slice(0, 300),
    }),
  );
};
