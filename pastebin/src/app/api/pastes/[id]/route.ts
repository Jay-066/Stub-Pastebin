import { NextRequest, NextResponse } from "next/server";
import { getAndRegisterView } from "@/lib/pastes";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || !/^[A-Za-z0-9]{1,64}$/.test(id)) {
    return NextResponse.json({ error: "Invalid paste id" }, { status: 400 });
  }

  const result = await getAndRegisterView(id);

  if (result.status === "not_found") {
    return NextResponse.json({ error: "Paste not found" }, { status: 404 });
  }
  if (result.status === "expired") {
    return NextResponse.json(
      { error: "This paste has expired or reached its view limit" },
      { status: 410 } // 410 Gone: semantically correct for expired content
    );
  }

  const { paste } = result;
  return NextResponse.json({
    id: paste.id,
    content: paste.content,
    createdAt: paste.created_at,
    expiresAt: paste.expires_at,
    maxViews: paste.max_views,
    viewCount: paste.view_count,
  });
}
