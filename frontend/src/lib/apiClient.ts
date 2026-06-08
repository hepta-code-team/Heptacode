const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

function getErrorMessage(errorBody: unknown, fallback: string) {
  if (!errorBody || typeof errorBody !== "object") {
    return fallback;
  }

  const body = errorBody as {
    message?: unknown;
    error?: unknown;
  };

  if (typeof body.error === "object" && body.error !== null && "message" in body.error) {
    const nestedMessage = (body.error as { message?: unknown }).message;

    if (typeof nestedMessage === "string" && nestedMessage.trim().length > 0) {
      return nestedMessage;
    }
  }

  if (typeof body.message === "string" && body.message.trim().length > 0) {
    return body.message;
  }

  if (typeof body.error === "string" && body.error.trim().length > 0) {
    return body.error;
  }

  return fallback;
}

async function request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const { body, headers, ...init } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `API request failed with status ${response.status}`;

    try {
      const errorBody = await response.json();
      message = getErrorMessage(errorBody, message);
    } catch {
      // Ignore invalid JSON error bodies.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}

export const apiClient = {
  get: <TResponse>(path: string, options?: RequestOptions) =>
    request<TResponse>(path, { ...options, method: "GET" }),
  post: <TResponse>(path: string, body?: unknown, options?: RequestOptions) =>
    request<TResponse>(path, { ...options, method: "POST", body }),
};
