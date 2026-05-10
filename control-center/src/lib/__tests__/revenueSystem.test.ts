import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let revenueData: Record<string, unknown> = { proposals: [], invoices: [], records: [] };
let sessions: Array<{ sessionId: string; missionType: string; progress: number; projectName: string; businessStatus: string; status: string }> = [];

vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => p.includes("revenue-system.json")),
    readFileSync: vi.fn((p: string) => {
      if (p.includes("revenue-system.json")) return JSON.stringify(revenueData);
      return "{}";
    }),
    writeFileSync: vi.fn((p: string, data: string) => {
      if (p.includes("revenue-system.json")) {
        try { revenueData = JSON.parse(data); } catch { /* ignore */ }
      }
    }),
  },
}));

vi.mock("@/lib/autopilotStore", () => ({
  listSessions: vi.fn(() => sessions),
}));

describe("revenueSystem", () => {
  beforeEach(() => {
    revenueData = { proposals: [], invoices: [], records: [] };
    sessions = [];
  });

  afterEach(() => {
    revenueData = { proposals: [], invoices: [], records: [] };
    sessions = [];
  });

  it("creates proposal with pricing estimate", async () => {
    const { createProposal, listProposals } = await import("@/lib/revenueSystem");

    const proposal = createProposal({ title: "Website Proposal", missionType: "website", complexity: "high", progress: 50 });

    expect(proposal.proposalId).toMatch(/^prop-/);
    expect(proposal.status).toBe("draft");
    expect(proposal.amount).toBeGreaterThan(2500);
    expect(proposal.estimate.missionType).toBe("website");
    expect(listProposals()).toHaveLength(1);
  });

  it("accepts and rejects proposals", async () => {
    const { acceptProposal, createProposal, rejectProposal } = await import("@/lib/revenueSystem");

    const accepted = createProposal({ title: "Accepted", missionType: "saas_project" });
    const rejected = createProposal({ title: "Rejected", missionType: "flyer" });

    expect(acceptProposal(accepted.proposalId)?.status).toBe("accepted");
    expect(rejectProposal(rejected.proposalId)?.status).toBe("rejected");
  });

  it("creates invoice and records payment", async () => {
    const { acceptProposal, createInvoice, createProposal, markInvoicePaid, listRevenueRecords } = await import("@/lib/revenueSystem");

    const proposal = createProposal({ title: "Invoice Test", clientId: "cli-1", amount: 3000 });
    acceptProposal(proposal.proposalId);
    const invoice = createInvoice({ proposalId: proposal.proposalId });

    expect(invoice).not.toBeNull();
    expect(invoice!.amount).toBe(3000);
    expect(invoice!.status).toBe("pending");

    const paid = markInvoicePaid(invoice!.invoiceId);
    expect(paid?.status).toBe("paid");
    expect(listRevenueRecords()).toHaveLength(1);
  });

  it("revenue overview calculates pipeline, revenue and conversion", async () => {
    const { acceptProposal, createInvoice, createProposal, getRevenueOverview, markInvoicePaid, rejectProposal } = await import("@/lib/revenueSystem");

    const open = createProposal({ title: "Open", amount: 1000, status: "sent" });
    const accepted = createProposal({ title: "Accepted", amount: 2000 });
    const rejected = createProposal({ title: "Rejected", amount: 3000 });
    acceptProposal(accepted.proposalId);
    rejectProposal(rejected.proposalId);
    const invoice = createInvoice({ proposalId: accepted.proposalId });
    markInvoicePaid(invoice!.invoiceId);

    const overview = getRevenueOverview();
    expect(open.status).toBe("sent");
    expect(overview.pipelineValue).toBe(1000);
    expect(overview.totalRevenue).toBe(2000);
    expect(overview.monthlyRevenue).toBe(2000);
    expect(overview.proposalConversionRate).toBe(50);
    expect(overview.paidInvoices).toBe(1);
  });

  it("auto-generates invoice when accepted linked mission is delivered", async () => {
    sessions = [{
      sessionId: "ap-delivered",
      missionType: "website",
      progress: 100,
      projectName: "Delivered Site",
      businessStatus: "delivered",
      status: "completed",
    }];
    const { acceptProposal, createProposal, getRevenueOverview, listInvoices } = await import("@/lib/revenueSystem");

    const proposal = createProposal({ missionId: "ap-delivered", clientId: "cli-1", amount: 2500 });
    acceptProposal(proposal.proposalId);
    const overview = getRevenueOverview();

    expect(overview.outstandingInvoices).toBe(1);
    expect(listInvoices()[0].missionId).toBe("ap-delivered");
  });

  it("revenue API handlers work", async () => {
    const proposalsRoute = await import("@/app/api/revenue/proposals/route");
    const invoicesRoute = await import("@/app/api/revenue/invoices/route");
    const acceptRoute = await import("@/app/api/revenue/proposals/[proposalId]/accept/route");
    const payRoute = await import("@/app/api/revenue/invoices/[invoiceId]/pay/route");
    const overviewRoute = await import("@/app/api/revenue/overview/route");

    const proposalResponse = await proposalsRoute.POST(new Request("http://test.local/api/revenue/proposals", {
      method: "POST",
      body: JSON.stringify({ title: "API Proposal", amount: 4200, missionType: "automation_workflow" }),
    }) as never);
    const proposalPayload = await proposalResponse.json();
    expect(proposalPayload.ok).toBe(true);

    const acceptResponse = await acceptRoute.POST(new Request("http://test.local") as never, {
      params: { proposalId: proposalPayload.proposal.proposalId },
    });
    expect((await acceptResponse.json()).proposal.status).toBe("accepted");

    const invoiceResponse = await invoicesRoute.POST(new Request("http://test.local/api/revenue/invoices", {
      method: "POST",
      body: JSON.stringify({ proposalId: proposalPayload.proposal.proposalId }),
    }) as never);
    const invoicePayload = await invoiceResponse.json();
    expect(invoicePayload.ok).toBe(true);

    const payResponse = await payRoute.POST(new Request("http://test.local") as never, {
      params: { invoiceId: invoicePayload.invoice.invoiceId },
    });
    expect((await payResponse.json()).invoice.status).toBe("paid");

    const overviewPayload = await (await overviewRoute.GET()).json();
    expect(overviewPayload.ok).toBe(true);
    expect(overviewPayload.overview.totalRevenue).toBe(4200);
  });
});
