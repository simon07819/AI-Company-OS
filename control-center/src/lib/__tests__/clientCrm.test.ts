import { describe, expect, it, vi, beforeAll, afterEach } from "vitest";

// ─── Mock fs ─────────────────────────────────────────────────────────────

let crmData: Record<string, unknown> = { leads: [], clients: [], opportunities: [], interactions: [] };

vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => p.includes("client-crm.json")),
    readFileSync: vi.fn((p: string) => {
      if (p.includes("client-crm.json")) return JSON.stringify(crmData);
      return "{}";
    }),
    writeFileSync: vi.fn((p: string, data: string) => {
      if (p.includes("client-crm.json")) {
        try { crmData = JSON.parse(data); } catch { /* ignore */ }
      }
    }),
  },
}));

vi.mock("path", async (importOriginal) => {
  const actual = await importOriginal<typeof import("path")>();
  return { ...actual, resolve: (...args: string[]) => args.join("/") };
});

// ─── Tests ───────────────────────────────────────────────────────────────

describe("clientCrm", () => {
  beforeAll(() => { crmData = { leads: [], clients: [], opportunities: [], interactions: [] }; });
  afterEach(() => { crmData = { leads: [], clients: [], opportunities: [], interactions: [] }; });

  it("createLead creates a lead with defaults", async () => {
    const { createLead, listLeads } = await import("@/lib/clientCrm");

    const lead = createLead({ name: "John Doe", email: "john@example.com" });
    expect(lead.leadId).toMatch(/^lead-/);
    expect(lead.name).toBe("John Doe");
    expect(lead.email).toBe("john@example.com");
    expect(lead.status).toBe("new");
    expect(lead.estimatedValue).toBe(0);

    const leads = listLeads();
    expect(leads.length).toBe(1);
    expect(leads[0].leadId).toBe(lead.leadId);
  });

  it("createLead with all fields", async () => {
    const { createLead } = await import("@/lib/clientCrm");

    const lead = createLead({ name: "Jane", email: "jane@corp.com", company: "Acme", source: "referral", estimatedValue: 5000, notes: "Big prospect" });
    expect(lead.company).toBe("Acme");
    expect(lead.source).toBe("referral");
    expect(lead.estimatedValue).toBe(5000);
    expect(lead.notes).toBe("Big prospect");
  });

  it("updateLead changes status", async () => {
    const { createLead, updateLead, getLead } = await import("@/lib/clientCrm");

    const lead = createLead({ name: "Test", email: "test@test.com" });
    const updated = updateLead(lead.leadId, { status: "contacted" });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("contacted");

    const fetched = getLead(lead.leadId);
    expect(fetched!.status).toBe("contacted");
  });

  it("convertLeadToClient creates client and updates lead", async () => {
    const { createLead, convertLeadToClient, listClients, getLead } = await import("@/lib/clientCrm");

    const lead = createLead({ name: "Convert Me", email: "conv@test.com", estimatedValue: 3000 });
    const result = convertLeadToClient(lead.leadId);

    expect(result).not.toBeNull();
    expect(result!.client.clientId).toMatch(/^cli-/);
    expect(result!.client.name).toBe("Convert Me");
    expect(result!.client.totalValue).toBe(3000);
    expect(result!.lead.status).toBe("won");

    // Lead is won
    const fetchedLead = getLead(lead.leadId);
    expect(fetchedLead!.status).toBe("won");

    // Client exists
    const clients = listClients();
    expect(clients.length).toBe(1);
    expect(clients[0].email).toBe("conv@test.com");
  });

  it("convertLeadToClient returns null for unknown lead", async () => {
    const { convertLeadToClient } = await import("@/lib/clientCrm");
    const result = convertLeadToClient("lead-nonexistent");
    expect(result).toBeNull();
  });

  it("createClient creates a client directly", async () => {
    const { createClient, listClients } = await import("@/lib/clientCrm");

    const client = createClient({ name: "Direct Client", email: "direct@test.com", company: "Inc", totalValue: 10000 });
    expect(client.clientId).toMatch(/^cli-/);
    expect(client.status).toBe("active");
    expect(client.totalValue).toBe(10000);

    const clients = listClients();
    expect(clients.length).toBe(1);
  });

  it("linkMissionToClient adds mission id", async () => {
    const { createClient, linkMissionToClient, getClient } = await import("@/lib/clientCrm");

    const client = createClient({ name: "Link Test", email: "link@test.com" });
    const updated = linkMissionToClient(client.clientId, "ap-test123");
    expect(updated).not.toBeNull();
    expect(updated!.linkedMissionIds).toContain("ap-test123");

    // Link again should not duplicate
    linkMissionToClient(client.clientId, "ap-test123");
    const fetched = getClient(client.clientId);
    expect(fetched!.linkedMissionIds.filter((id) => id === "ap-test123").length).toBe(1);

    // Link different mission
    linkMissionToClient(client.clientId, "ap-test456");
    const fetched2 = getClient(client.clientId);
    expect(fetched2!.linkedMissionIds.length).toBe(2);
  });

  it("addInteraction records an interaction", async () => {
    const { createClient, addInteraction, listInteractions } = await import("@/lib/clientCrm");

    const client = createClient({ name: "Int Test", email: "int@test.com" });
    const interaction = addInteraction({ clientId: client.clientId, type: "call", summary: "Initial call with client" });
    expect(interaction.interactionId).toMatch(/^int-/);
    expect(interaction.type).toBe("call");
    expect(interaction.summary).toBe("Initial call with client");

    const interactions = listInteractions();
    expect(interactions.length).toBe(1);
  });

  it("getCrmOverview calculates correct stats", async () => {
    const { createLead, createClient, addInteraction, getCrmOverview } = await import("@/lib/clientCrm");

    createLead({ name: "L1", email: "l1@test.com", estimatedValue: 1000 });
    createLead({ name: "L2", email: "l2@test.com", estimatedValue: 2000 });
    createClient({ name: "C1", email: "c1@test.com", totalValue: 5000 });
    addInteraction({ type: "note", summary: "Test note" });

    const overview = getCrmOverview();
    expect(overview.totalLeads).toBe(2);
    expect(overview.activeLeads).toBe(2);
    expect(overview.totalClients).toBe(1);
    expect(overview.activeClients).toBe(1);
    expect(overview.leadsByStatus.new).toBe(2);
    expect(overview.clientsByStatus.active).toBe(1);
    expect(overview.recentInteractions.length).toBeGreaterThan(0);
  });

  it("getCrmOverview returns empty state when no data", async () => {
    const { getCrmOverview } = await import("@/lib/clientCrm");
    const overview = getCrmOverview();
    expect(overview.totalLeads).toBe(0);
    expect(overview.totalClients).toBe(0);
    expect(overview.pipelineValue).toBe(0);
    expect(overview.wonValue).toBe(0);
  });

  it("createOpportunity requires valid client", async () => {
    const { createOpportunity } = await import("@/lib/clientCrm");
    const opp = createOpportunity({ clientId: "cli-nonexistent", title: "Test", value: 1000 });
    expect(opp).toBeNull();
  });

  it("createOpportunity creates with default probability", async () => {
    const { createClient, createOpportunity, listOpportunities } = await import("@/lib/clientCrm");

    const client = createClient({ name: "Opp Test", email: "opp@test.com" });
    const opp = createOpportunity({ clientId: client.clientId, title: "Big Deal", value: 50000 });
    expect(opp).not.toBeNull();
    expect(opp!.probability).toBe(50);
    expect(opp!.status).toBe("open");

    const opps = listOpportunities();
    expect(opps.length).toBe(1);
  });
});
