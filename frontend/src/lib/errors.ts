export type ErrorContext = {
  nodeId?: string;
  nodeType?: string;
};

type ErrorDetail = {
  message?: unknown;
  error?: unknown;
  node_id?: unknown;
  node_type?: unknown;
  nodeId?: unknown;
  nodeType?: unknown;
};

type ErrorShape = {
  detail?: unknown;
  message?: unknown;
  error?: unknown;
  node_id?: unknown;
  node_type?: unknown;
  nodeId?: unknown;
  nodeType?: unknown;
  status?: number;
  isNetworkError?: boolean;
};

type BackendError = {
  message?: unknown;
  node_id?: unknown;
  node_type?: unknown;
  type?: unknown;
};

const readMessage = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) return value;
  return undefined;
};

const extractFromDetail = (detail: unknown): string | undefined => {
  if (typeof detail === "string") return detail;
  if (!detail || typeof detail !== "object") return undefined;

  const typedDetail = detail as ErrorDetail;
  const direct = readMessage(typedDetail.message);
  if (direct) return direct;

  if (typedDetail.error && typeof typedDetail.error === "object") {
    const nested = typedDetail.error as BackendError;
    const nestedMessage = readMessage(nested.message);
    if (nestedMessage) return nestedMessage;
  }

  return undefined;
};

export const extractErrorMessage = (error: unknown): string => {
  if (typeof error === "string") return error;

  if (error && typeof error === "object") {
    const typedError = error as ErrorShape;

    if (typedError.isNetworkError) {
      return "Cannot reach the backend API. Start the FastAPI server on port 8000.";
    }

    const directMessage = readMessage(typedError.message);
    if (directMessage && directMessage !== "Internal Server Error") {
      return directMessage;
    }

    const detailMessage = extractFromDetail(typedError.detail);
    if (detailMessage) return detailMessage;

    if (typedError.error && typeof typedError.error === "object") {
      const backendError = typedError.error as BackendError;
      const backendMessage = readMessage(backendError.message);
      if (backendMessage) return backendMessage;
    }

    if (directMessage) return directMessage;
  }

  return "Unknown error";
};

export const extractErrorContext = (error: unknown): ErrorContext => {
  if (!error || typeof error !== "object") return {};

  const typedError = error as ErrorShape;

  const fromBackendError = (backendError: BackendError): ErrorContext => {
    const backendNodeId =
      typeof backendError.node_id === "string" ? backendError.node_id : undefined;
    const backendNodeType =
      typeof backendError.node_type === "string" ? backendError.node_type : undefined;
    if (backendNodeId || backendNodeType) {
      return { nodeId: backendNodeId, nodeType: backendNodeType };
    }
    return {};
  };

  if (typedError.error && typeof typedError.error === "object") {
    const context = fromBackendError(typedError.error as BackendError);
    if (context.nodeId || context.nodeType) return context;
  }

  const directNodeId =
    typeof typedError.nodeId === "string" ? typedError.nodeId : undefined;
  const directNodeType =
    typeof typedError.nodeType === "string" ? typedError.nodeType : undefined;
  if (directNodeId || directNodeType) {
    return { nodeId: directNodeId, nodeType: directNodeType };
  }

  const legacyNodeId =
    typeof typedError.node_id === "string" ? typedError.node_id : undefined;
  const legacyNodeType =
    typeof typedError.node_type === "string" ? typedError.node_type : undefined;
  if (legacyNodeId || legacyNodeType) {
    return { nodeId: legacyNodeId, nodeType: legacyNodeType };
  }

  if (typedError.detail && typeof typedError.detail === "object") {
    const detail = typedError.detail as ErrorDetail;
    const detailNodeId =
      typeof detail.nodeId === "string"
        ? detail.nodeId
        : typeof detail.node_id === "string"
          ? detail.node_id
          : undefined;
    const detailNodeType =
      typeof detail.nodeType === "string"
        ? detail.nodeType
        : typeof detail.node_type === "string"
          ? detail.node_type
          : undefined;
    if (detailNodeId || detailNodeType) {
      return { nodeId: detailNodeId, nodeType: detailNodeType };
    }

    if (detail.error && typeof detail.error === "object") {
      const context = fromBackendError(detail.error as BackendError);
      if (context.nodeId || context.nodeType) return context;
    }
  }

  return {};
};

export const parseErrorResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  let body: unknown = null;

  if (contentType.includes("application/json")) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  } else {
    try {
      const text = await response.text();
      body = text || null;
    } catch {
      body = null;
    }
  }

  const isGenericServerError =
    typeof body === "string" && body.trim() === "Internal Server Error";

  let message = extractErrorMessage(body ?? { message: response.statusText });

  if (response.status >= 500 && (body == null || isGenericServerError)) {
    message =
      "The backend returned an internal server error. Ensure Python dependencies are installed and the API server is running.";
  }

  const context = extractErrorContext(body);

  return { message, ...context, detail: body, status: response.status };
};
