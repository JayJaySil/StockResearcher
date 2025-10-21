"use client"

import React, { useCallback, useState } from "react"
import { useDropzone, FileRejection } from "react-dropzone"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { bulkUpsertDividends, type BulkUpsertDividendsResult } from "@/lib/actions/dividend.actions"
import * as XLSX from "xlsx"

type DividendUploaderProps = {
  symbol: string
  companyId: string
  className?: string
  onSaved?: (count: number) => void
}

type ParsedDividend = { payDate: Date; divPerShare: number; dividendYield?: number }

// Parse dates like 5/23/2025 or 05/23/2025 (MM/DD/YYYY)
function parseUSDate(input: string): Date | null {
  const s = String(input).trim()
  const m = s.match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/)
  if (!m) return null
  const month = Number(m[1])
  const day = Number(m[2])
  const year = Number(m[3])
  if (!month || !day || !year) return null
  const d = new Date(year, month - 1, day)
  return isNaN(d.getTime()) ? null : d
}

// Find the header row by looking for required column labels
function findHeaderRow(rows: any[][]): { rowIndex: number; columns: Record<string, number> } | null {
  const symRe = /\bsymbol\b/i
  const payDateRe = /payment\s*date/i
  const dpsRe = /dividend\s*(?:\(\s*per\s*share\s*\)|per\s*share|per\s*sh|per\s*si)/i
  const yieldRe = /dividend\s*yield/i

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || []
    const map: Record<string, number> = {}
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? "")
      if (symRe.test(cell)) map.symbol = c
      if (payDateRe.test(cell)) map.paymentDate = c
      if (yieldRe.test(cell)) map.dividendYield = c
      if (dpsRe.test(cell)) map.dividendPerShare = c
    }
    if (map.symbol != null && map.paymentDate != null && (map.dividendPerShare != null || map.dividendYield != null)) {
      return { rowIndex: r, columns: map }
    }
  }
  return null
}

export default function DividendUploader({ symbol, companyId, className, onSaved }: DividendUploaderProps) {
  const [parsing, setParsing] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setParsing(true)
    try {
      const ab = await file.arrayBuffer()
      const wb = XLSX.read(ab, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

      if (!rows || rows.length === 0) {
        toast.error("Spreadsheet is empty")
        return
      }

      const header = findHeaderRow(rows)
      if (!header) {
        toast.error("Unrecognized format. Could not find header row with Symbol, Payment Date, Dividend")
        return
      }

      const { rowIndex, columns } = header
      const start = rowIndex + 1

      const parsed: ParsedDividend[] = []
      for (let r = start; r < rows.length; r++) {
        const row = rows[r] || []
        const sym = String(row[columns.symbol] ?? "").trim()
        const payDateRaw = row[columns.paymentDate]
        const dpsRaw = columns.dividendPerShare != null ? row[columns.dividendPerShare] : undefined
        const yieldRaw = columns.dividendYield != null ? row[columns.dividendYield] : undefined

        // Stop if we hit a totally empty line
        const isEmpty = [sym, payDateRaw, dpsRaw, yieldRaw].every((v) => v == null || (typeof v === 'string' && v.trim() === ""))
        if (isEmpty) break

        // Ensure the symbol column is either empty or matches the provided symbol
        if (sym && sym.toUpperCase() !== symbol.toUpperCase()) continue

        // Parse payment date (can come as excel serial, JS date, or string)
        let payDate: Date | null = null
        if (typeof payDateRaw === "number") {
          // Excel serial number to JS date (25569 days between 1899-12-30 and 1970-01-01)
          payDate = new Date(Math.round((payDateRaw - 25569) * 86400 * 1000))
        } else if (payDateRaw instanceof Date) {
          payDate = payDateRaw
        } else if (typeof payDateRaw === "string") {
          payDate = parseUSDate(payDateRaw)
        }
        if (!payDate) continue

        // Parse dividend amount (strip any non-numeric except - and .)
        let dps: number | undefined = undefined
        if (dpsRaw != null) {
          dps = typeof dpsRaw === "number" ? dpsRaw : parseFloat(String(dpsRaw ?? "").replace(/[^0-9.-]/g, ""))
          if (!Number.isFinite(dps)) dps = undefined
        }

        let dividendYield: number | undefined = undefined
        if (yieldRaw != null) {
          dividendYield = typeof yieldRaw === "number" ? yieldRaw : parseFloat(String(yieldRaw ?? "").replace(/[^0-9.-]/g, ""))
          if (!Number.isFinite(dividendYield)) dividendYield = undefined
        }

        if (dps == null && dividendYield == null) continue

        parsed.push({ payDate, divPerShare: dps ?? 0, dividendYield })
      }

      if (parsed.length === 0) {
        toast.error("No dividend rows found to import")
        return
      }

      // Persist to MongoDB via server action
      const res: BulkUpsertDividendsResult = await bulkUpsertDividends(companyId, parsed)
      if (!res.success) {
        toast.error(res.error || "Failed to save dividends")
        return
      }

      toast.success(`Saved ${res.count} dividend record(s) for ${symbol}`)
      onSaved?.(res.count)
    } catch (e) {
      console.error(e)
      toast.error("Failed to parse spreadsheet")
    } finally {
      setParsing(false)
    }
  }, [companyId, symbol, onSaved])

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    if (fileRejections.length === 0) return
    const hasTooLarge = fileRejections.some((r) => r.errors.some((e) => e.code === "file-too-large"))
    const invalidType = fileRejections.some((r) => r.errors.some((e) => e.code === "file-invalid-type"))
    if (hasTooLarge) toast.error("The file is too large. Max 10MB.")
    if (invalidType) toast.error("Invalid type. Upload .xls or .xlsx")
    if (!hasTooLarge && !invalidType) toast.error(fileRejections[0]?.errors[0]?.message || "File rejected")
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    maxFiles: 1,
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
  })

  return (
    <Card
      className={cn(
        "relative border-2 border-dashed duration-200 ease-in-out w-full h-48",
        isDragActive ? "border-primary bg-primary/10 border-solid" : "border-border bg-black-200 hover:border-primary",
        className,
      )}
      {...getRootProps()}
    >
      <CardContent className="flex flex-col justify-center items-center h-full">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the spreadsheet here ...</p>
        ) : (
          <div className="flex flex-col items-center justify-center h-full w-full gap-y-3">
            <p>Drag and drop the dividend Excel, or click to select</p>
            <Button disabled={parsing}>{parsing ? "Parsing..." : "Select File"}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
