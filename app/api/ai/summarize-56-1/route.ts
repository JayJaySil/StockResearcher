//https://www.youtube.com/watch?v=6CgeNtJwKFs
//https://www.youtube.com/watch?v=gu4pafNCXng&t=15006s
//https://www.raymondcamden.com/2024/05/21/using-the-gemini-file-api-for-prompts-with-media

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { connectToDatabase } from "@/database/mongoose";
import { Summary } from "@/database/models/summary.model";
import { v4 as uuidv4 } from "uuid";

// Use Gemini for summarization. Expects GEMINI_API_KEY in env.
export const runtime = 'nodejs'
// Request longer execution window on Vercel (best-effort, plan-dependent)
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    // Accept multipart form-data: file (PDF), companyId, symbol, optional fileName
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const companyId = (formData.get("companyId") as string | null)?.trim();
    const symbol = (formData.get("symbol") as string | null)?.trim();
    const providedFileName = (formData.get("fileName") as string | null) || undefined;

    if (!file) {
      return NextResponse.json({ error: "Missing file in form-data under 'file'" }, { status: 400 });
    }
    if (!companyId) {
      return NextResponse.json({ error: "Missing 'companyId' in form-data" }, { status: 400 });
    }

    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);
    const mimeType = (file.type && file.type.length > 0 ? file.type : "application/pdf");
    const fileName = providedFileName || (file as any).name || "56-1.pdf";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const generativeAIClient = new GoogleGenerativeAI(apiKey);
    const geminiFileManager = new GoogleAIFileManager(apiKey);

    // Upload the PDF as a Gemini File
    const displayName = fileName;
    const uploadResult = await geminiFileManager.uploadFile(fileBuffer, {
      mimeType,
      displayName,
    });

    // Upload responses
    const uploadedFileRecord: any = (uploadResult as any).file ?? uploadResult;
    const uploadedFileName: string = uploadedFileRecord.name;

    // Newly uploaded files may be processing for a long time.
    async function waitForActiveFile(fileName: string, signal?: AbortSignal) {
      const configuredFileActivationTimeoutMs = Number(process.env.GEMINI_FILE_ACTIVATE_TIMEOUT_MS || 300_000);
      const activationTimeoutMs = Math.min(
        Number.isFinite(configuredFileActivationTimeoutMs) ? configuredFileActivationTimeoutMs : 300_000,
        55_000
      ); // keep under typical serverless limits
      const activationDeadlineAt = Date.now() + activationTimeoutMs;
      let backoffMs = 1_000; // start 1s, backoff to max 5s
      let lastFileState: string | undefined = uploadedFileRecord.state as string | undefined;
      while (Date.now() < activationDeadlineAt) {
        if (signal?.aborted) {
          throw new Error('Client aborted while waiting for file to activate');
        }
        const fileResponse: any = await geminiFileManager.getFile(fileName);
        const fileState = (fileResponse.file?.state ?? fileResponse.state) as string | undefined;
        lastFileState = fileState;
        if (fileState === 'ACTIVE') {
          const fileUri = fileResponse.file?.uri || fileResponse.uri;
          const fileMimeType = fileResponse.file?.mimeType || fileResponse.mimeType;
          const activeFileName = fileResponse.file?.name || fileResponse.name;
          return { uri: fileUri, mimeType: fileMimeType, name: activeFileName };
        }
        if (fileState === 'FAILED' || fileState === 'DELETED' || fileState === 'EXPIRED') {
          throw new Error(`File is not usable. state=${lastFileState}`);
        }
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        backoffMs = Math.min(backoffMs * 1.5, 5_000);
      }
      throw new Error(`Timed out waiting for file to become ACTIVE. lastState=${lastFileState}`);
    }

    const activeFile = await waitForActiveFile(uploadedFileName, (req as any).signal);

    const modelName = process.env.GEMINI_MODEL_ID || "gemini-2.5-flash-lite";
    const generativeModel = generativeAIClient.getGenerativeModel({ model: modelName });

    const systemPrompt = `You are an equity research assistant. Summarize Thailand SEC 56-1 One Reports for fundamental investors. Write concise, well-structured points.

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

    const userPrompt = `Summarize the attached 56-1 One Report for investors. Not too wordy. Use bullet points where appropriate.`;

    const generationResult = await generativeModel.generateContent([
      { text: systemPrompt },
      { fileData: { fileUri: activeFile.uri, mimeType: activeFile.mimeType } },
      { text: userPrompt },
    ]);

    const summary = generationResult.response.text();

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
  } catch (error: any) {
    console.error("summarize-56-1 error", error);
    const errorMessage = typeof error?.message === 'string' ? error.message : 'Summarization failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
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
    const summaryDoc = await Summary.findOne({ companyId }).lean();
    if (!summaryDoc || !summaryDoc.summary) {
      return NextResponse.json({ summary: null }, { status: 200 });
    }
    return NextResponse.json({ summary: summaryDoc.summary, companyId }, { status: 200 });
  } catch (error) {
    console.error("summarize-56-1 GET error", error);
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 });
  }
}
