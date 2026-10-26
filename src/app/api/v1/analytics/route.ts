import { NextResponse } from "next/server";
import { withApiKey } from "@/lib/api";
import { getAnalytics } from "@/lib/services";

export const GET = withApiKey(async (_req, workspaceId) => NextResponse.json({ data: await getAnalytics(workspaceId) }));
