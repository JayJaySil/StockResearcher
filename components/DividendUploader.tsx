//https://www.youtube.com/watch?v=83bECYmPbI4&t=9s
//https://ui.shadcn.com/docs/components/card

"use client"

import React, { useCallback, useState } from "react"
import { useDropzone, FileRejection } from "react-dropzone"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { importDividendsFromRows, type storeDividendsResult } from "@/lib/actions/dividend.actions"
import * as XLSX from "xlsx"
import Link from "next/link"

type DividendUploaderProps = {
  symbol: string
  companyId: string
  className?: string
  onSaved?: (count: number) => void
}


export default function DividendUploader({ symbol, companyId, className, onSaved }: DividendUploaderProps) {
  const [parsing, setParsing] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    //Only 1 file accepted
    const file = acceptedFiles[0]
    if (!file) {
      toast.error("No file selected")
      return
    }
    setParsing(true)
    //Parse Excel into JSON
    try {
      const fileArrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(fileArrayBuffer, { type: "array" })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      const res: storeDividendsResult = await importDividendsFromRows({ companyId, symbol, rows })
      if (!res.success) {
        toast.error(res.error || "Failed to save dividends")
        return
      }

      toast.success(`Saved ${res.count} dividend record(s) for ${symbol}`)
      onSaved?.(res.count)
    } catch (error) {
      console.error(error)
      toast.error("Failed to parse spreadsheet")
    } finally {
      setParsing(false)
    }
  }, [companyId, symbol, onSaved]) //Only run when files change

  //Validation checks
  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    if (fileRejections.length === 0) return
    const hasTooLarge = fileRejections.some((r) => r.errors.some((e) => e.code === "file-too-large"))
    const invalidType = fileRejections.some((r) => r.errors.some((e) => e.code === "file-invalid-type"))
    if (hasTooLarge) toast.error("The file is too large. Max 4.5MB.")
    if (invalidType) toast.error("Invalid type. Upload .xls or .xlsx")
    if (!hasTooLarge && !invalidType) toast.error(fileRejections[0]?.errors[0]?.message || "File rejected")
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected,
    maxFiles: 1,
    multiple: false,
    maxSize: 4.5 * 1024 * 1024, //4.5MB for vercel limit
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
