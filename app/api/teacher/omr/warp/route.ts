import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

type WarpServiceResponse = {
  warped_image_base64: string;
  corners_found: boolean;
};

export async function POST(req: Request) {
  try {
    const guard = await requireApiRole("teacher");
    if ("response" in guard) return guard.response;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Badan permintaan tidak sah (JSON diperlukan)" }, { status: 400 });
    }
    const image_base64 = String((body as Record<string, unknown>)?.image_base64 ?? "").trim();
    if (!image_base64) {
      return NextResponse.json({ message: "image_base64 diperlukan" }, { status: 400 });
    }
    if (image_base64.length > 20_000_000) {
      return NextResponse.json({ message: "Imej terlalu besar" }, { status: 413 });
    }

    const omrServiceUrl = process.env.OMR_SERVICE_URL || "http://127.0.0.1:8000";

    let serviceData: WarpServiceResponse;
    try {
      const res = await fetch(`${omrServiceUrl}/warp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64 }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`Service error ${res.status}`);
      serviceData = await res.json() as WarpServiceResponse;
      if (!serviceData?.warped_image_base64) throw new Error("Invalid service response shape");
    } catch (serviceErr) {
      // Service unavailable or timeout — return original image, never block scan
      console.warn("OMR warp service unavailable, falling back to original image:", serviceErr);
      return NextResponse.json({
        success: true,
        warped_image_base64: image_base64,
        corners_found: false,
        fallback_used: true,
      });
    }

    return NextResponse.json({
      success: true,
      warped_image_base64: serviceData.warped_image_base64,
      corners_found: serviceData.corners_found ?? false,
      fallback_used: !serviceData.corners_found,
    });
  } catch (err) {
    console.error("POST teacher/omr/warp FAILED:", err);
    return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
  }
}
