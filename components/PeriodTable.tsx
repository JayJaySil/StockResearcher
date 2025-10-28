"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";





export default function PeriodTable(props: PeriodTableProps) {
  const [period, setPeriod] = React.useState<"yearly" | "quarterly">(
    props.initialPeriod || "yearly"
  );

  // pick which dataset to show
  const active = period === "yearly" ? props.yearly : props.quarterly;

  // Renders cell value with formatting if provided
  const renderCell = (row: any, col: Column) => {
    const raw = row[col.key];
    if (col.format) {
      try {
        return col.format(raw, row);
      } catch (e) {
        // if the format function fails, show the raw value
        return String(raw);
      }
    }
    return raw;
  };

  return (
    <div className={`space-y-3 ${props.className}`}>
        <div className="text-sm font-semibold text-foreground">
            {props.title}
        </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={period === "yearly" ? "default" : "outline"}
          onClick={() => setPeriod("yearly")}
        >
          Yearly
        </Button>
        <Button
          type="button"
          variant={period === "quarterly" ? "default" : "outline"}
          onClick={() => setPeriod("quarterly")}
        >
          Quarterly
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              {active.columns.map((col, i) => (
                <TableHead key={i}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.rows && active.rows.length > 0 ? (
              active.rows.map((row, rIdx) => (
                <TableRow key={rIdx}>
                  {active.columns.map((col, cIdx) => (
                    <TableCell key={cIdx}>
                      {renderCell(row, col)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={active.columns.length || 1}
                  className="text-center text-muted-foreground"
                >
                  {props.emptyStateText || "No data"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
