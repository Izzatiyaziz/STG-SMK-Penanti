import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

type WarpServiceResponse = {
  warped_image_base64: string;
  corners_found: boolean;
};

export async function POST(req: Request) {
  try {
    const guard = await requireApiRole("teacher");
    if ("response" in guard) return guard.response;

    const body = await req.json();
    const image_base64 = String(body?.image_base64 ?? "").trim();
    if (!image_base64) {
      return NextResponse.json({ message: "image_base64 diperlukan" }, { status: 400 });
    }

    const omrServiceUrl = process.env.OMR_SERVICE_URL || "http://127.0.0.1:8001";

    let serviceData: WarpServiceResponse;
    try {
      const res = await fetch(`${omrServiceUrl}/warp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64 }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Service error ${res.status}`);
      serviceData = await res.json() as WarpServiceResponse;
    } catch {
      // Service unavailable or timeout — return original image, never block scan
      return NextResponse.json({
        success: true,
        warped_image_base64: image_base64,
        corners_found: false,
        warning: "Perkhidmatan warp tidak tersedia, imej asal digunakan",
      });
    }

    return NextResponse.json({
      success: true,
      warped_image_base64: serviceData.warped_image_base64,
      corners_found: serviceData.corners_found,
      ...(!serviceData.corners_found && {
        warning: "Sudut kertas tidak dikesan, imej asal digunakan",
      }),
    });
  } catch (err) {
    console.error("POST teacher/omr/warp FAILED:", err);
    return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
  }
}
