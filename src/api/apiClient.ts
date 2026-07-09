const API_URL = "http://localhost:5000/api";

const REQUEST_TIMEOUT = 15000;

function getHeaders(body?: BodyInit | null): HeadersInit {
  const token = localStorage.getItem("token");

  const headers: HeadersInit = {};

  // لا نضيف Content-Type إذا كان FormData
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

async function request(endpoint: string, options: RequestInit = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...getHeaders(options.body),
        ...options.headers,
      },
    });

    clearTimeout(timeout);

    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      window.location.href = "/login";

      throw new Error("انتهت صلاحية الجلسة.");
    }

    if (response.status === 403) {
      throw new Error("ليس لديك صلاحية لتنفيذ هذا الإجراء.");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "حدث خطأ في الخادم.");
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeout);

    if (error.name === "AbortError") {
      throw new Error("انتهت مهلة الاتصال بالخادم.");
    }

    if (error.message === "Failed to fetch") {
      throw new Error("تعذر الاتصال بالخادم.");
    }

    throw error;
  }
}

export const api = {
  get: (url: string) => request(url),

  post: (url: string, body: any) =>
    request(url, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: (url: string, body: any) =>
    request(url, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: (url: string) =>
    request(url, {
      method: "DELETE",
    }),
};
