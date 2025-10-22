import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { connectToDatabase } from "@/database/mongoose";
import { Summary } from "@/database/models/summary.model";
import { v4 as uuidv4 } from "uuid";

// Use Gemini for summarization. Expects GEMINI_API_KEY in env.
// Accepts: { key: string; fileName?: string; contentType?: string; symbol?: string }
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    // Accept multipart form-data: file (PDF), companyId, symbol, optional fileName
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const companyId = (form.get("companyId") as string | null)?.trim();
    const symbol = (form.get("symbol") as string | null)?.trim();
    const providedName = (form.get("fileName") as string | null) || undefined;

    if (!file) {
      return NextResponse.json({ error: "Missing file in form-data under 'file'" }, { status: 400 });
    }
    if (!companyId) {
      return NextResponse.json({ error: "Missing 'companyId' in form-data" }, { status: 400 });
    }

    const arrayBuf = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuf);
    const mimeType = (file.type && file.type.length > 0 ? file.type : "application/pdf");
    const fileName = providedName || (file as any).name || "56-1.pdf";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);

    // Upload the PDF as a Gemini File so the model can reference it directly
    const displayName = fileName;
    const upload = await fileManager.uploadFile(fileBuffer, {
      mimeType,
      displayName,
    });

    // Upload responses can differ by SDK version; normalize common fields
    const uploadedFileAny: any = (upload as any).file ?? upload;
    const uploadedName: string = uploadedFileAny.name;

    // Newly uploaded files may be PROCESSING. Poll until ACTIVE before using.
    async function waitForActive(name: string, signal?: AbortSignal) {
      const timeoutMs = Number(process.env.GEMINI_FILE_ACTIVATE_TIMEOUT_MS || 300_000); // default 5 minutes
      const deadline = Date.now() + timeoutMs;
      let wait = 1_000; // start 1s, backoff to max 5s
      let lastState: string | undefined = uploadedFileAny.state as string | undefined;
      while (Date.now() < deadline) {
        if (signal?.aborted) {
          throw new Error('Client aborted while waiting for file to activate');
        }
        const f: any = await fileManager.getFile(name);
        const state = (f.file?.state ?? f.state) as string | undefined;
        lastState = state;
        if (state === 'ACTIVE') {
          const uri = f.file?.uri || f.uri
          const mimeType = f.file?.mimeType || f.mimeType
          const name = f.file?.name || f.name
          return { uri, mimeType, name }
        }
        if (state === 'FAILED' || state === 'DELETED' || state === 'EXPIRED') {
          throw new Error(`File is not usable. state=${lastState}`);
        }
        await new Promise((r) => setTimeout(r, wait));
        wait = Math.min(wait * 1.5, 5_000);
      }
      throw new Error(`Timed out waiting for file to become ACTIVE. lastState=${lastState}`);
    }

    const activeFile = await waitForActive(uploadedName, (req as any).signal);

    // Align with Inngest functions.ts default model style
    const modelId = process.env.GEMINI_MODEL_ID || "gemini-2.5-flash-lite";
    const model = genAI.getGenerativeModel({ model: modelId });

    const sys = `You are an equity research assistant. Summarize Thailand SEC 56-1 One Reports for fundamental investors. Write concise, well-structured points.

Return sections (in this exact order):
- Company Overview
- Business Model
- What they Buy
- What they Sell
- Risk Factors (top 3–5)
- Items Needing Deeper Review

Formatting requirements (important):
- Return STRICTLY in Markdown.
- Each section title must be an H2 heading using: ## Title
- Add a blank line after every heading.
- Use bullet points ("-") inside sections.
- Add ONE blank line between bullet points for better spacing.
- Add ONE blank line between sections.
- Keep bullets short and specific.

Keep it specific to the provided file. If ticker provided: ${symbol ?? "(none)"}.`;

    const prompt = `Summarize the attached 56-1 One Report for investors. Not too wordy. Use bullet points where appropriate.`;

    const result = await model.generateContent([
      { text: sys },
      { fileData: { fileUri: activeFile.uri, mimeType: activeFile.mimeType } },
      { text: prompt },
    ]);

    const summary = result.response.text();

    // Persist the summary keyed by companyId (no file stored)
    await connectToDatabase();
    const summaryId = uuidv4();
    await Summary.findOneAndUpdate(
      { companyId },
      {
        $set: { summary, addedAt: new Date() },
        $setOnInsert: { summaryId, companyId },
      },
      { upsert: true }
    );

    return NextResponse.json({ summary, companyId }, { status: 200 });
  } catch (err: any) {
    console.error("summarize-56-1 error", err);
    const msg = typeof err?.message === 'string' ? err.message : 'Summarization failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("companyId");
    if (!companyId) {
      return NextResponse.json({ error: "Missing 'companyId' query param" }, { status: 400 });
    }

    await connectToDatabase();
    const doc = await Summary.findOne({ companyId }).lean();
    if (!doc || !doc.summary) {
      return NextResponse.json({ summary: null }, { status: 200 });
    }
    return NextResponse.json({ summary: doc.summary, companyId }, { status: 200 });
  } catch (err) {
    console.error("summarize-56-1 GET error", err);
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 });
  }
}
