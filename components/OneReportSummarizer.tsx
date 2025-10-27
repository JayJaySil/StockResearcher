"use client"
// OneReportSummarizer lets users upload a 56-1 PDF and shows a Gemini-powered
// Markdown summary; includes size/type validation and result toasts.

import React, { useCallback, useEffect, useState } from "react"
import { useDropzone, FileRejection } from "react-dropzone"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"

type Props = {
  symbol: string
  companyId: string
  className?: string
}

export default function OneReportSummarizer({ symbol, companyId, className }: Props) {
  const [summarizing, setSummarizing] = useState(false)
  const [summary, setSummary] = useState<string>("")
  const [fileName, setFileName] = useState<string>("")

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    setSummary("")
    setFileName(file.name)
    setSummarizing(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("symbol", symbol)
      fd.append("companyId", companyId)
      fd.append("fileName", file.name)

      const res = await fetch("/api/ai/summarize-56-1", { method: "POST", body: fd })
      if (!res.ok) {
        let message = "Summarization failed"
        try {
          const err = await res.json()
          message = err?.error || message
        } catch {}
        throw new Error(message)
      }
      const data = await res.json()
      setSummary(data.summary || "")
      toast.success("Summarized successfully")
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message : "Failed to upload or summarize the report"
      toast.error(msg)
    } finally {
      setSummarizing(false)
    }
  }, [symbol, companyId])

  // Load existing summary on mount (if available)
  useEffect(() => {
    let aborted = false
    ;(async () => {
      try {
        const res = await fetch(`/api/ai/summarize-56-1?companyId=${encodeURIComponent(companyId)}`)
        if (!res.ok) return
        const data = await res.json()
        if (!aborted && data?.summary) setSummary(data.summary)
      } catch {
        // ignore fetch errors, user can re-upload
      }
    })()
    return () => {
      aborted = true
    }
  }, [companyId])

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    if (rejections.length === 0) return
    const tooLarge = rejections.some((r) => r.errors.some((e) => e.code === "file-too-large"))
    const invalid = rejections.some((r) => r.errors.some((e) => e.code === "file-invalid-type"))
    if (tooLarge) toast.error("File too large (max 4MB)")
    if (invalid) toast.error("Invalid type. Please upload a PDF.")
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected,
    maxFiles: 1,
    multiple: false,
    maxSize: 4 * 1024 * 1024, // 4 MB to match Vercel body limit for Serverless
    noClick: true,
    accept: { "application/pdf": [".pdf"] },
  })

  return (
    <div className={cn("space-y-4", className)}>
      <Card
        className={cn(
          "relative border-2 border-dashed duration-200 ease-in-out w-full h-48",
          isDragActive ? "border-primary bg-primary/10 border-solid" : "border-border bg-black-200 hover:border-primary",
        )}
        {...getRootProps()}
      >
        <CardContent className="flex flex-col justify-center items-center h-full">
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the 56-1 PDF here ...</p>
          ) : (
            <div className="flex flex-col items-center justify-center h-full w-full gap-y-3">
              <p>Drag and drop 56-1 One Report (PDF), or click to select</p>
              <Button onClick={open} disabled={summarizing}>
                {summarizing ? "Summarizing..." : "Select PDF"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {fileName && (
        <p className="text-sm text-gray-400">Selected: {fileName}</p>
      )}

      {summary && (
        <div className="p-4 bg-gray-800 rounded max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              h2: ({ node, ...props }) => (
                <h2 className="text-xl font-bold mt-6 mb-3" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-lg font-semibold mt-5 mb-2" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="mb-3 leading-relaxed" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc pl-5 my-3 space-y-2" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal pl-5 my-3 space-y-2" {...props} />
              ),
              li: ({ node, ...props }) => <li className="mb-1" {...props} />,
              strong: ({ node, ...props }) => (
                <strong className="font-semibold text-gray-100" {...props} />
              ),
              em: ({ node, ...props }) => <em className="italic" {...props} />,
            }}
          >
            {summary}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}
