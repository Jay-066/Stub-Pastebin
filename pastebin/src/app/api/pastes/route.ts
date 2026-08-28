import { NextRequest, NextResponse } from "next/server";
import { createPaste, ValidationError } from "@/lib/pastes";

export async function GET() {
  return NextResponse.json({
    description: "Pastebin-like API",
    endpoints: {
      "POST /api/pastes": {
        body: {
          content: "string (required)",
          expiresInSeconds: "number (optional) — TTL from creation time",
          maxViews: "number (optional) — burn the paste after N views",
        },
        returns: "{ id, url, rawUrl, createdAt, expiresAt, maxViews }",
      },
      "GET /api/pastes/:id": {
        returns:
          "{ id, content, createdAt, expiresAt, maxViews, viewCount } — registers a view",
        errors: "404 if unknown id, 410 if expired or view limit reached",
      },
    },
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { content, expiresInSeconds, maxViews } = (body ?? {}) as Record<
    string,
    unknown
  >;

  try {
    const paste = await createPaste({
      content: content as string,
      expiresInSeconds:
        expiresInSeconds === undefined || expiresInSeconds === null
          ? null
          : Number(expiresInSeconds),
      maxViews:
        maxViews === undefined || maxViews === null
          ? null
          : Number(maxViews),
    });

    const origin = req.nextUrl.origin;

    return NextResponse.json(
      {
        id: paste.id,
        url: `${origin}/p/${paste.id}`,
        rawUrl: `${origin}/api/pastes/${paste.id}`,
        createdAt: paste.created_at,
        expiresAt: paste.expires_at,
        maxViews: paste.max_views,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to create paste:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
