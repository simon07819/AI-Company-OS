import { NextResponse } from "next/server";
import { getRevenueOverview, listInvoices, listProposals, listRevenueRecords } from "@/lib/revenueSystem";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    overview: getRevenueOverview(),
    proposals: listProposals(),
    invoices: listInvoices(),
    records: listRevenueRecords(),
  });
}
