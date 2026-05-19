export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(request, params);
}

async function handleProxy(
  request: Request,
  params: Promise<{ path: string[] }>
) {
  const baseUrl = request.headers.get("X-Wx-Base-Url");
  if (!baseUrl) {
    return Response.json(
      { error: "X-Wx-Base-Url header is required" },
      { status: 400 }
    );
  }

  const { path } = await params;
  const apiPath = path.join("/");
  const url = `${baseUrl.replace(/\/+$/, "")}/${apiPath}`;

  // Only forward safe headers
  const forwardHeaders = new Headers();
  const safeHeaders = ["content-type", "authorization", "accept"];
  request.headers.forEach((value, key) => {
    if (safeHeaders.includes(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  });

  try {
    const response = await fetch(url, {
      method: request.method,
      headers: forwardHeaders,
      body:
        request.method !== "GET" && request.method !== "HEAD"
          ? await request.text()
          : undefined,
    });

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch {
    return Response.json(
      { error: "Failed to reach the upstream API" },
      { status: 502 }
    );
  }
}
