import { NextResponse } from "next/server";
import { analyzeScreenshot } from "@/lib/vision";

export async function POST(req: Request) {
  try {
    const { image, prompt } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google AI API key not configured. Get one free at https://aistudio.google.com/apikey" },
        { status: 400 }
      );
    }

    const analysis = await analyzeScreenshot(image, apiKey);
    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("[Vision] Analysis failed:", error);
    return NextResponse.json(
      { error: error.message || "Vision analysis failed" },
      { status: 500 }
    );
  }
}
