import fs from "fs";
import path from "path";
import { listSessions } from "./autopilotStore";
import { archiveEntity, restoreEntity, softDeleteEntity } from "./archiveSystem";

// ─── Paths ────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const REVENUE_PATH = path.join(DATA_DIR, "revenue-system.json");

// ─── Types ────────────────────────────────────────────────────────────────

export type ProposalStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected";
export type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";
export type Currency = "USD" | "CAD" | "EUR";
export type EstimateComplexity = "low" | "medium" | "high" | "enterprise";

export interface PricingEstimate {
  estimateId: string;
  missionType: string;
  complexity: EstimateComplexity;
  progress: number;
  basePrice: number;
  complexityMultiplier: number;
  progressAdjustment: number;
  estimatedValue: number;
  monthlyRecurring: number;
  createdAt: string;
}

export interface TaxSettings {
  tpsRate: number;
  tvqRate: number;
}

export interface Proposal {
  proposalId: string;
  title: string;
  leadId: string | null;
  clientId: string | null;
  missionId: string | null;
  missionType: string;
  status: ProposalStatus;
  estimate: PricingEstimate;
  amount: number;
  currency: Currency;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
}

export interface Invoice {
  invoiceId: string;
  proposalId: string | null;
  clientId: string | null;
  missionId: string | null;
  status: InvoiceStatus;
  amount: number;
  currency: Currency;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems?: LineItem[];
  subtotal?: number;
  tpsRate?: number;
  tpsAmount?: number;
  tvqRate?: number;
  tvqAmount?: number;
  total?: number;
  archivedAt?: string | null;
  deletedAt?: string | null;
}

export interface RevenueRecord {
  recordId: string;
  invoiceId: string;
  proposalId: string | null;
  clientId: string | null;
  missionId: string | null;
  amount: number;
  currency: Currency;
  recordedAt: string;
}

export interface RevenueOverview {
  totalRevenue: number;
  monthlyRevenue: number;
  estimatedMonthlyRevenue: number;
  pipelineValue: number;
  acceptedProposalValue: number;
  outstandingInvoices: number;
  outstandingInvoiceValue: number;
  paidInvoices: number;
  proposalConversionRate: number;
  totalProposals: number;
  openProposals: number;
  totalInvoices: number;
  recentRevenue: RevenueRecord[];
  proposalsByStatus: Record<ProposalStatus, number>;
  invoicesByStatus: Record<InvoiceStatus, number>;
}

interface RevenueData {
  proposals: Proposal[];
  invoices: Invoice[];
  records: RevenueRecord[];
}

export interface CreateProposalInput {
  title?: string;
  leadId?: string | null;
  clientId?: string | null;
  missionId?: string | null;
  missionType?: string | null;
  complexity?: EstimateComplexity;
  progress?: number;
  amount?: number;
  status?: ProposalStatus;
}

export interface CreateInvoiceInput {
  proposalId?: string | null;
  clientId?: string | null;
  missionId?: string | null;
  amount?: number;
  dueDate?: string;
}

// ─── Persistence ──────────────────────────────────────────────────────────

function emptyData(): RevenueData {
  return { proposals: [], invoices: [], records: [] };
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readRevenue(): RevenueData {
  ensureDataDir();
  if (!fs.existsSync(REVENUE_PATH)) return emptyData();
  try {
    const raw = fs.readFileSync(REVENUE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<RevenueData>;
    return {
      proposals: parsed.proposals ?? [],
      invoices: parsed.invoices ?? [],
      records: parsed.records ?? [],
    };
  } catch {
    return emptyData();
  }
}

function writeRevenue(data: RevenueData) {
  ensureDataDir();
  fs.writeFileSync(REVENUE_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ─── Helpers ──────────────────────────────────────────────────────────────

let idCounter = Date.now();
function nextId(prefix: string): string {
  return `${prefix}-${(idCounter++).toString(36)}`;
}

const BASE_PRICES: Record<string, number> = {
  saas_project: 5000,
  website: 2500,
  branding_pack: 1500,
  flyer: 500,
  business_card: 300,
  ecommerce_store: 4000,
  social_campaign: 2000,
  automation_workflow: 3500,
};

const COMPLEXITY_MULTIPLIERS: Record<EstimateComplexity, number> = {
  low: 0.75,
  medium: 1,
  high: 1.45,
  enterprise: 2.1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function addDays(date: Date, days: number): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function inferMission(missionId?: string | null): { missionType: string; progress: number; title: string } | null {
  if (!missionId) return null;
  const session = listSessions().find((item) => item.sessionId === missionId);
  if (!session) return null;
  return {
    missionType: session.missionType,
    progress: session.progress,
    title: `${session.projectName.replace(/-/g, " ")} proposal`,
  };
}

function createRevenueRecord(invoice: Invoice): RevenueRecord {
  return {
    recordId: nextId("rev"),
    invoiceId: invoice.invoiceId,
    proposalId: invoice.proposalId,
    clientId: invoice.clientId,
    missionId: invoice.missionId,
    amount: invoice.amount,
    currency: "USD",
    recordedAt: new Date().toISOString(),
  };
}

function syncDeliveredMissionInvoices(data: RevenueData): boolean {
  let changed = false;
  const deliveredIds = new Set(
    listSessions()
      .filter((session) => session.businessStatus === "delivered" || session.status === "completed")
      .map((session) => session.sessionId),
  );

  for (const proposal of data.proposals) {
    if (proposal.status !== "accepted" || !proposal.missionId || !deliveredIds.has(proposal.missionId)) continue;
    const exists = data.invoices.some((invoice) => invoice.proposalId === proposal.proposalId || invoice.missionId === proposal.missionId);
    if (exists) continue;
    const now = new Date().toISOString();
    data.invoices.push({
      invoiceId: nextId("inv"),
      proposalId: proposal.proposalId,
      clientId: proposal.clientId,
      missionId: proposal.missionId,
      status: "pending",
      amount: proposal.amount,
      currency: "USD",
      dueDate: addDays(new Date(), 14),
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    });
    changed = true;
  }

  return changed;
}

// ─── Public API ───────────────────────────────────────────────────────────

export function generatePricingEstimate(input: {
  missionType?: string | null;
  complexity?: EstimateComplexity;
  progress?: number;
}): PricingEstimate {
  const missionType = input.missionType || "saas_project";
  const complexity = input.complexity ?? "medium";
  const progress = clamp(input.progress ?? 0, 0, 100);
  const basePrice = BASE_PRICES[missionType] ?? 2000;
  const complexityMultiplier = COMPLEXITY_MULTIPLIERS[complexity];
  const progressAdjustment = 1 + progress / 500;
  const estimatedValue = Math.round(basePrice * complexityMultiplier * progressAdjustment);
  const monthlyRecurring = Math.round(estimatedValue * (missionType === "social_campaign" || missionType === "automation_workflow" ? 0.18 : 0.08));

  return {
    estimateId: nextId("est"),
    missionType,
    complexity,
    progress,
    basePrice,
    complexityMultiplier,
    progressAdjustment,
    estimatedValue,
    monthlyRecurring,
    createdAt: new Date().toISOString(),
  };
}

export function createProposal(input: CreateProposalInput): Proposal {
  const inferred = inferMission(input.missionId);
  const missionType = input.missionType || inferred?.missionType || "saas_project";
  const progress = input.progress ?? inferred?.progress ?? 0;
  const estimate = generatePricingEstimate({ missionType, complexity: input.complexity, progress });
  const now = new Date().toISOString();
  const proposal: Proposal = {
    proposalId: nextId("prop"),
    title: input.title || inferred?.title || `${missionType.replace(/_/g, " ")} proposal`,
    leadId: input.leadId ?? null,
    clientId: input.clientId ?? null,
    missionId: input.missionId ?? null,
    missionType,
    status: input.status ?? "draft",
    estimate,
    amount: input.amount ?? estimate.estimatedValue,
    currency: "USD",
    validUntil: addDays(new Date(), 14),
    createdAt: now,
    updatedAt: now,
    acceptedAt: null,
    rejectedAt: null,
  };

  const data = readRevenue();
  data.proposals.push(proposal);
  writeRevenue(data);
  return proposal;
}

export function listProposals(options?: { includeArchived?: boolean; includeDeleted?: boolean }): Proposal[] {
  const data = readRevenue();
  return data.proposals
    .filter((proposal) => options?.includeDeleted || !proposal.deletedAt)
    .filter((proposal) => options?.includeArchived || !proposal.archivedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function acceptProposal(proposalId: string): Proposal | null {
  const data = readRevenue();
  const idx = data.proposals.findIndex((proposal) => proposal.proposalId === proposalId);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  data.proposals[idx] = { ...data.proposals[idx], status: "accepted", acceptedAt: now, rejectedAt: null, updatedAt: now };
  syncDeliveredMissionInvoices(data);
  writeRevenue(data);
  return data.proposals[idx];
}

export function rejectProposal(proposalId: string): Proposal | null {
  const data = readRevenue();
  const idx = data.proposals.findIndex((proposal) => proposal.proposalId === proposalId);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  data.proposals[idx] = { ...data.proposals[idx], status: "rejected", rejectedAt: now, updatedAt: now };
  writeRevenue(data);
  return data.proposals[idx];
}

export function createInvoice(input: CreateInvoiceInput): Invoice | null {
  const data = readRevenue();
  const proposal = input.proposalId ? data.proposals.find((item) => item.proposalId === input.proposalId) : null;
  const amount = input.amount ?? proposal?.amount;
  if (!amount || amount <= 0) return null;
  const now = new Date().toISOString();
  const invoice: Invoice = {
    invoiceId: nextId("inv"),
    proposalId: input.proposalId ?? null,
    clientId: input.clientId ?? proposal?.clientId ?? null,
    missionId: input.missionId ?? proposal?.missionId ?? null,
    status: "pending",
    amount,
    currency: "USD",
    dueDate: input.dueDate ?? addDays(new Date(), 14),
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  };

  data.invoices.push(invoice);
  writeRevenue(data);
  return invoice;
}

export function listInvoices(options?: { includeArchived?: boolean; includeDeleted?: boolean }): Invoice[] {
  const data = readRevenue();
  syncDeliveredMissionInvoices(data);
  writeRevenue(data);
  return data.invoices
    .filter((invoice) => options?.includeDeleted || !invoice.deletedAt)
    .filter((invoice) => options?.includeArchived || !invoice.archivedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function markInvoicePaid(invoiceId: string): Invoice | null {
  const data = readRevenue();
  const idx = data.invoices.findIndex((invoice) => invoice.invoiceId === invoiceId);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  data.invoices[idx] = { ...data.invoices[idx], status: "paid", paidAt: now, updatedAt: now };
  if (!data.records.some((record) => record.invoiceId === invoiceId)) {
    data.records.push(createRevenueRecord(data.invoices[idx]));
  }
  writeRevenue(data);
  return data.invoices[idx];
}

export function markInvoiceUnpaid(invoiceId: string): Invoice | null {
  const data = readRevenue();
  const idx = data.invoices.findIndex((invoice) => invoice.invoiceId === invoiceId);
  if (idx === -1) return null;
  data.invoices[idx] = { ...data.invoices[idx], status: "pending", paidAt: null, updatedAt: new Date().toISOString() };
  data.records = data.records.filter((record) => record.invoiceId !== invoiceId);
  writeRevenue(data);
  return data.invoices[idx];
}

export function calculateInvoiceTotals(lineItems: LineItem[], taxes: Partial<TaxSettings> = {}) {
  const subtotal = Math.round(lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0) * 100) / 100;
  const tpsRate = taxes.tpsRate ?? 5;
  const tvqRate = taxes.tvqRate ?? 9.975;
  const tpsAmount = Math.round(subtotal * (tpsRate / 100) * 100) / 100;
  const tvqAmount = Math.round(subtotal * (tvqRate / 100) * 100) / 100;
  const total = Math.round((subtotal + tpsAmount + tvqAmount) * 100) / 100;
  return { subtotal, tpsRate, tpsAmount, tvqRate, tvqAmount, total };
}

export function updateProposal(proposalId: string, patch: Partial<Proposal>): Proposal | null {
  const data = readRevenue();
  const idx = data.proposals.findIndex((proposal) => proposal.proposalId === proposalId);
  if (idx === -1) return null;
  data.proposals[idx] = { ...data.proposals[idx], ...patch, proposalId, updatedAt: new Date().toISOString() };
  writeRevenue(data);
  return data.proposals[idx];
}

export function updateInvoice(invoiceId: string, patch: Partial<Invoice>): Invoice | null {
  const data = readRevenue();
  const idx = data.invoices.findIndex((invoice) => invoice.invoiceId === invoiceId);
  if (idx === -1) return null;
  const lineItems = patch.lineItems ?? data.invoices[idx].lineItems;
  const totals = lineItems ? calculateInvoiceTotals(lineItems, { tpsRate: patch.tpsRate ?? data.invoices[idx].tpsRate, tvqRate: patch.tvqRate ?? data.invoices[idx].tvqRate }) : {};
  data.invoices[idx] = {
    ...data.invoices[idx],
    ...patch,
    ...totals,
    amount: (totals as { total?: number }).total ?? patch.amount ?? data.invoices[idx].amount,
    invoiceId,
    updatedAt: new Date().toISOString(),
  };
  writeRevenue(data);
  return data.invoices[idx];
}

export function duplicateProposal(proposalId: string): Proposal | null {
  const proposal = readRevenue().proposals.find((item) => item.proposalId === proposalId);
  if (!proposal) return null;
  return createProposal({
    title: `${proposal.title} Copy`,
    leadId: proposal.leadId,
    clientId: proposal.clientId,
    missionId: proposal.missionId,
    missionType: proposal.missionType,
    amount: proposal.amount,
    status: "draft",
  });
}

export function duplicateInvoice(invoiceId: string): Invoice | null {
  const source = readRevenue().invoices.find((item) => item.invoiceId === invoiceId);
  if (!source) return null;
  const created = createInvoice({
    proposalId: source.proposalId,
    clientId: source.clientId,
    missionId: source.missionId,
    amount: source.amount,
    dueDate: source.dueDate,
  });
  if (!created) return null;
  return updateInvoice(created.invoiceId, {
    lineItems: source.lineItems,
    subtotal: source.subtotal,
    tpsRate: source.tpsRate,
    tpsAmount: source.tpsAmount,
    tvqRate: source.tvqRate,
    tvqAmount: source.tvqAmount,
    total: source.total,
  });
}

export function archiveRevenue(kind: "proposal" | "invoice", id: string) {
  const item = kind === "proposal"
    ? updateProposal(id, { archivedAt: new Date().toISOString() })
    : updateInvoice(id, { archivedAt: new Date().toISOString() });
  if (item) archiveEntity({ entityType: "revenues", entityId: id, snapshot: item, label: kind === "proposal" ? (item as Proposal).title : id });
  return item;
}

export function restoreRevenue(kind: "proposal" | "invoice", id: string) {
  const item = kind === "proposal"
    ? updateProposal(id, { archivedAt: null, deletedAt: null })
    : updateInvoice(id, { archivedAt: null, deletedAt: null });
  if (item) restoreEntity("revenues", id);
  return item;
}

export function softDeleteRevenue(kind: "proposal" | "invoice", id: string) {
  const now = new Date().toISOString();
  const item = kind === "proposal"
    ? updateProposal(id, { archivedAt: now, deletedAt: now })
    : updateInvoice(id, { archivedAt: now, deletedAt: now });
  if (item) softDeleteEntity({ entityType: "revenues", entityId: id, snapshot: item, label: kind === "proposal" ? (item as Proposal).title : id });
  return item;
}

export function listRevenueRecords(): RevenueRecord[] {
  return readRevenue().records.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

export function getRevenueOverview(): RevenueOverview {
  const data = readRevenue();
  if (syncDeliveredMissionInvoices(data)) writeRevenue(data);

  const proposalsByStatus: Record<ProposalStatus, number> = {
    draft: 0, sent: 0, viewed: 0, accepted: 0, rejected: 0,
  };
  const invoicesByStatus: Record<InvoiceStatus, number> = {
    pending: 0, paid: 0, overdue: 0, cancelled: 0,
  };

  for (const proposal of data.proposals) proposalsByStatus[proposal.status]++;
  for (const invoice of data.invoices) invoicesByStatus[invoice.status]++;

  const now = new Date();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  const totalRevenue = data.records.reduce((sum, record) => sum + record.amount, 0);
  const monthlyRevenue = data.records
    .filter((record) => {
      const date = new Date(record.recordedAt);
      return date.getUTCMonth() === month && date.getUTCFullYear() === year;
    })
    .reduce((sum, record) => sum + record.amount, 0);

  const openProposals = data.proposals.filter((proposal) => ["draft", "sent", "viewed"].includes(proposal.status));
  const acceptedProposals = data.proposals.filter((proposal) => proposal.status === "accepted");
  const closedProposals = data.proposals.filter((proposal) => proposal.status === "accepted" || proposal.status === "rejected");
  const outstanding = data.invoices.filter((invoice) => invoice.status === "pending" || invoice.status === "overdue");
  const monthlyRecurring = data.proposals
    .filter((proposal) => proposal.status === "accepted")
    .reduce((sum, proposal) => sum + proposal.estimate.monthlyRecurring, 0);

  return {
    totalRevenue: Math.round(totalRevenue),
    monthlyRevenue: Math.round(monthlyRevenue),
    estimatedMonthlyRevenue: Math.round(monthlyRecurring),
    pipelineValue: Math.round(openProposals.reduce((sum, proposal) => sum + proposal.amount, 0)),
    acceptedProposalValue: Math.round(acceptedProposals.reduce((sum, proposal) => sum + proposal.amount, 0)),
    outstandingInvoices: outstanding.length,
    outstandingInvoiceValue: Math.round(outstanding.reduce((sum, invoice) => sum + invoice.amount, 0)),
    paidInvoices: invoicesByStatus.paid,
    proposalConversionRate: closedProposals.length === 0 ? 0 : Math.round((proposalsByStatus.accepted / closedProposals.length) * 100),
    totalProposals: data.proposals.length,
    openProposals: openProposals.length,
    totalInvoices: data.invoices.length,
    recentRevenue: data.records
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      .slice(0, 8),
    proposalsByStatus,
    invoicesByStatus,
  };
}

// ─── Enhanced Invoice with Line Items + TPS/TVQ ──────────────────────────

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ClientBillingInfo {
  name: string;
  email?: string;
  address?: string;
  phone?: string;
}

export interface Expense {
  expenseId: string;
  missionId: string | null;
  description: string;
  amount: number;
  category: string;
  date: string;
}

export interface EnhancedInvoice extends Invoice {
  invoiceNumber: string;
  clientBilling: ClientBillingInfo | null;
  lineItems: LineItem[];
  subtotal: number;
  tpsRate: number;
  tpsAmount: number;
  tvqRate: number;
  tvqAmount: number;
  total: number;
  expenses: Expense[];
  profit: number;
}

interface EnhancedRevenueData extends RevenueData {
  enhancedInvoices: EnhancedInvoice[];
  expenses: Expense[];
}

function readEnhanced(): EnhancedRevenueData {
  ensureDataDir();
  if (!fs.existsSync(REVENUE_PATH)) return { ...emptyData(), enhancedInvoices: [], expenses: [] };
  try {
    const raw = fs.readFileSync(REVENUE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<EnhancedRevenueData>;
    return {
      proposals: parsed.proposals ?? [],
      invoices: parsed.invoices ?? [],
      records: parsed.records ?? [],
      enhancedInvoices: parsed.enhancedInvoices ?? [],
      expenses: parsed.expenses ?? [],
    };
  } catch {
    return { ...emptyData(), enhancedInvoices: [], expenses: [] };
  }
}

function writeEnhanced(data: EnhancedRevenueData) {
  ensureDataDir();
  fs.writeFileSync(REVENUE_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function readSettingsRates(): { tpsRate: number; tvqRate: number; currency: string; invoicePrefix: string; companyName: string } {
  const settingsPath = path.join(DATA_DIR, "settings.json");
  if (!fs.existsSync(settingsPath)) return { tpsRate: 5, tvqRate: 9.975, currency: "CAD", invoicePrefix: "INV", companyName: "" };
  try {
    const s = JSON.parse(fs.readFileSync(settingsPath, "utf-8")) as Record<string, unknown>;
    return {
      tpsRate: typeof s.tpsRate === "number" ? s.tpsRate : 5,
      tvqRate: typeof s.tvqRate === "number" ? s.tvqRate : 9.975,
      currency: typeof s.currency === "string" ? s.currency : "CAD",
      invoicePrefix: typeof s.invoicePrefix === "string" ? s.invoicePrefix : "INV",
      companyName: typeof s.companyName === "string" ? s.companyName : "",
    };
  } catch {
    return { tpsRate: 5, tvqRate: 9.975, currency: "CAD", invoicePrefix: "INV", companyName: "" };
  }
}

export function createEnhancedInvoice(input: {
  clientId?: string | null;
  missionId?: string | null;
  clientBilling?: ClientBillingInfo | null;
  lineItems?: LineItem[];
  tpsRate?: number;
  tvqRate?: number;
  dueDate?: string;
  invoiceNumber?: string;
}): EnhancedInvoice {
  const data = readEnhanced();
  const settings = readSettingsRates();

  const lineItems = input.lineItems ?? [];
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const tpsRate = input.tpsRate ?? settings.tpsRate;
  const tvqRate = input.tvqRate ?? settings.tvqRate;
  const tpsAmount = Math.round(subtotal * (tpsRate / 100) * 100) / 100;
  const tvqAmount = Math.round(subtotal * (tvqRate / 100) * 100) / 100;
  const total = Math.round((subtotal + tpsAmount + tvqAmount) * 100) / 100;

  const invCount = data.enhancedInvoices.length + 1;
  const invoiceNumber = input.invoiceNumber ?? `${settings.invoicePrefix}-${String(invCount).padStart(4, "0")}`;

  const now = new Date().toISOString();
  const enhanced: EnhancedInvoice = {
    invoiceId: nextId("einv"),
    invoiceNumber,
    proposalId: null,
    clientId: input.clientId ?? null,
    missionId: input.missionId ?? null,
    clientBilling: input.clientBilling ?? null,
    status: "pending",
    lineItems,
    subtotal,
    tpsRate,
    tpsAmount,
    tvqRate,
    tvqAmount,
    total,
    amount: total,
    currency: settings.currency as Currency,
    dueDate: input.dueDate ?? addDays(new Date(), 30),
    paidAt: null,
    expenses: [],
    profit: total,
    createdAt: now,
    updatedAt: now,
  };

  data.enhancedInvoices.push(enhanced);
  writeEnhanced(data);
  return enhanced;
}

export function listEnhancedInvoices(): EnhancedInvoice[] {
  const data = readEnhanced();
  return data.enhancedInvoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getEnhancedInvoice(invoiceId: string): EnhancedInvoice | null {
  return readEnhanced().enhancedInvoices.find((inv) => inv.invoiceId === invoiceId) ?? null;
}

export function addExpense(input: { missionId?: string | null; description: string; amount: number; category?: string }): Expense {
  const data = readEnhanced();
  const expense: Expense = {
    expenseId: nextId("exp"),
    missionId: input.missionId ?? null,
    description: input.description,
    amount: input.amount,
    category: input.category ?? "operations",
    date: new Date().toISOString(),
  };
  data.expenses.push(expense);

  // Recalculate profit on affected invoices
  for (const inv of data.enhancedInvoices) {
    if (inv.missionId && inv.missionId === expense.missionId) {
      const missionExpenses = data.expenses.filter((e) => e.missionId === inv.missionId);
      const totalExpenses = missionExpenses.reduce((sum, e) => sum + e.amount, 0);
      inv.expenses = missionExpenses;
      inv.profit = Math.round((inv.total - totalExpenses) * 100) / 100;
    }
  }

  writeEnhanced(data);
  return expense;
}

export function exportInvoiceMarkdown(invoiceId: string): string | null {
  const data = readEnhanced();
  const inv = data.enhancedInvoices.find((i) => i.invoiceId === invoiceId);
  if (!inv) return null;

  const settings = readSettingsRates();
  const cur = settings.currency;

  const lines = [
    `# ${inv.invoiceNumber}`,
    ``,
    `**From:** ${settings.companyName || "AI Company OS"}`,
    `**Date:** ${new Date(inv.createdAt).toLocaleDateString()}`,
    `**Due:** ${new Date(inv.dueDate).toLocaleDateString()}`,
    `**Status:** ${inv.status.toUpperCase()}`,
    ``,
  ];

  if (inv.clientBilling) {
    lines.push(`**Bill To:**`);
    lines.push(`${inv.clientBilling.name}`);
    if (inv.clientBilling.email) lines.push(`${inv.clientBilling.email}`);
    if (inv.clientBilling.address) lines.push(`${inv.clientBilling.address}`);
    lines.push(``);
  }

  lines.push(`| Description | Qty | Unit Price | Total |`);
  lines.push(`|---|---|---|---|`);
  for (const item of inv.lineItems) {
    lines.push(`| ${item.description} | ${item.quantity} | ${item.unitPrice.toFixed(2)} ${cur} | ${item.total.toFixed(2)} ${cur} |`);
  }
  lines.push(``);
  lines.push(`**Subtotal:** ${inv.subtotal.toFixed(2)} ${cur}`);
  if (inv.tpsRate > 0) lines.push(`**TPS/GST (${inv.tpsRate}%):** ${inv.tpsAmount.toFixed(2)} ${cur}`);
  if (inv.tvqRate > 0) lines.push(`**TVQ/QST (${inv.tvqRate}%):** ${inv.tvqAmount.toFixed(2)} ${cur}`);
  lines.push(`**Total:** ${inv.total.toFixed(2)} ${cur}`);

  if (inv.expenses.length > 0) {
    lines.push(``);
    lines.push(`## Expenses`);
    for (const exp of inv.expenses) {
      lines.push(`- ${exp.description}: ${exp.amount.toFixed(2)} ${cur} (${exp.category})`);
    }
    lines.push(``);
    lines.push(`**Profit:** ${inv.profit.toFixed(2)} ${cur}`);
  }

  const md = lines.join("\n");

  // Write to data/invoices/
  const invoicesDir = path.join(DATA_DIR, "invoices");
  fs.mkdirSync(invoicesDir, { recursive: true });
  fs.writeFileSync(path.join(invoicesDir, `${inv.invoiceNumber}.md`), md + "\n", "utf-8");

  return md;
}
