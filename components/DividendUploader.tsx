"use client"

import React, { useCallback, useState } from "react"
import { useDropzone, FileRejection } from "react-dropzone"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { bulkUpsertDividends, type BulkUpsertDividendsResult } from "@/lib/actions/dividend.actions"
import * as XLSX from "xlsx"
import Link from "next/link"

type DividendUploaderProps = {
  symbol: string
  companyId: string
  className?: string
  onSaved?: (count: number) => void
}

type ParsedDividend = { payDate: Date; divPerShare: number }

// Parse dates like 5/23/2025 or 05/23/2025 (MM/DD/YYYY) using a simple loop
function parseUSDate(input: string): Date | null {
  const trimmed = String(input).trim()
  const s = trimmed.endsWith("*") ? trimmed.slice(0, -1).trim() : trimmed

  const parts: number[] = []
  let token = ""
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch >= "0" && ch <= "9") {
      token += ch
    } else if (ch === "/") {
      if (token.length === 0) return null
      parts.push(Number(token))
      token = ""
    } else if (ch === " ") {
      // ignore spaces
      continue
    } else {
      return null
    }
  }
  if (token.length > 0) parts.push(Number(token))
  if (parts.length !== 3) return null

  const [month, day, year] = parts
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000 || year > 9999) return null

  const dt = new Date(year, month - 1, day)
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null
  return dt
}

// Find the header row by looking for required column labels
function findHeaderRow(rows: any[][]): { rowIndex: number; columns: Record<string, number> } | null {
  // Fixed columns, but discover the header row dynamically by scanning the first 30 rows.
  const SYMBOL_COL = 0; // A
  const DPS_COL = 3; // D (Dividend per Share)
  const PAYDATE_COL = 8; // I (Payment Date)

  const MAX_SCAN_ROWS = Math.min(rows.length, 30);
  for (let idx = 0; idx < MAX_SCAN_ROWS; idx++) {
    const row = rows[idx];
    if (!row) continue;

    const dpsHeader = String(row[DPS_COL] ?? "").toLowerCase();
    const symHeader = String(row[SYMBOL_COL] ?? "").toLowerCase();
    const payHeader = String(row[PAYDATE_COL] ?? "").toLowerCase();

    const looksValid = dpsHeader.includes("dividend") && !dpsHeader.includes("yield") &&
      symHeader.includes("symbol") && payHeader.includes("payment") && payHeader.includes("date");

    if (looksValid) {
      return {
        rowIndex: idx,
        columns: { symbol: SYMBOL_COL, dividendPerShare: DPS_COL, paymentDate: PAYDATE_COL },
      };
    }
  }
  return null;
}

export default function DividendUploader({ symbol, companyId, className, onSaved }: DividendUploaderProps) {
  const [parsing, setParsing] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) {
      toast.error("No file selected")
      return
    }
    setParsing(true)
    try {
      const fileArrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(fileArrayBuffer, { type: "array" })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

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
      const skipCounts = { symbolMismatch: 0, invalidDate: 0, invalidDps: 0 }
      for (let r = start; r < rows.length; r++) {
        const row = rows[r] || []
        const sym = String(row[columns.symbol] ?? "").trim()
        const payDateRaw = row[columns.paymentDate]
        const dpsRaw = row[columns.dividendPerShare]

        // Stop if we hit a totally empty line
        const isEmpty = [sym, payDateRaw, dpsRaw].every((v) => v == null || (typeof v === 'string' && v.trim() === ""))
        if (isEmpty) break

        // Ensure the symbol column is either empty or matches the provided symbol
        if (sym && sym.toUpperCase() !== symbol.toUpperCase()) {
          skipCounts.symbolMismatch += 1
          continue
        }

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
        if (!payDate) {
          skipCounts.invalidDate += 1
          continue
        }

        // Parse dividend amount (strip any non-numeric except - and .)
        const dps = typeof dpsRaw === "number" ? dpsRaw : parseFloat(String(dpsRaw ?? "").replace(/[^0-9.-]/g, ""))
        if (!Number.isFinite(dps)) {
          skipCounts.invalidDps += 1
          continue
        }

        parsed.push({ payDate, divPerShare: dps })
      }

      if (parsed.length === 0) {
        toast.error("No dividend rows found to import")
        return
      }

      const totalSkipped = skipCounts.symbolMismatch + skipCounts.invalidDate + skipCounts.invalidDps
      if (totalSkipped > 0) {
        toast(
          `Skipped ${totalSkipped} row(s)` +
            ` — invalid date: ${skipCounts.invalidDate},` +
            ` invalid amount: ${skipCounts.invalidDps},` +
            ` symbol mismatch: ${skipCounts.symbolMismatch}`
        )
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

  //Validation checks
  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    if (fileRejections.length === 0) return
    const hasTooLarge = fileRejections.some((r) => r.errors.some((e) => e.code === "file-too-large"))
    const invalidType = fileRejections.some((r) => r.errors.some((e) => e.code === "file-invalid-type"))
    if (hasTooLarge) toast.error("The file is too large. Max 10MB.")
    if (invalidType) toast.error("Invalid type. Upload .xls or .xlsx")
    if (!hasTooLarge && !invalidType) toast.error(fileRejections[0]?.errors[0]?.message || "File rejected")
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected,
    maxFiles: 1,
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    noClick: true,
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
            <Link
              href="https://www.setsmart.com/ssm/rightsAndBenefits;viewBy=byCompany;caType=XD"
              target="_blank"
              onClick={(e) => e.stopPropagation()}
              className="text-sm underline text-blue-500"
            >
              Link for downloading dividend data from SETSMART
            </Link>
            <Button onClick={open} disabled={parsing}>{parsing ? "Parsing..." : "Select File"}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
