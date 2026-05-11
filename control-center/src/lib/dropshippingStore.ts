import fs from "fs";
import path from "path";

// ─── Paths ────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const DROPSHIP_PATH = path.join(DATA_DIR, "dropshipping.json");

// ─── Types ────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "ordered" | "shipped" | "delivered" | "issue";
export type ProductStatus = "active" | "out_of_stock" | "discontinued";
export type SupplierStatus = "active" | "on_hold" | "discontinued";

export interface Product {
  productId: string;
  name: string;
  description: string;
  price: number;          // selling price
  cost: number;           // supplier cost
  supplierId: string | null;
  category: string;
  status: ProductStatus;
  imageUrl: string | null;
  createdAt: string;
}

export interface Supplier {
  supplierId: string;
  name: string;
  contact: string;
  country: string;
  status: SupplierStatus;
  rating: number;         // 0-5
  createdAt: string;
}

export interface Order {
  orderId: string;
  productId: string;
  supplierId: string | null;
  customerName: string;
  customerEmail: string | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: OrderStatus;
  trackingNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DropshippingOverview {
  totalProducts: number;
  activeProducts: number;
  totalSuppliers: number;
  activeSuppliers: number;
  totalOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  revenue: number;
  cost: number;
  profit: number;
}

interface DropshippingData {
  products: Product[];
  suppliers: Supplier[];
  orders: Order[];
}

// ─── Persistence ──────────────────────────────────────────────────────────

function emptyData(): DropshippingData {
  return { products: [], suppliers: [], orders: [] };
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData(): DropshippingData {
  ensureDataDir();
  if (!fs.existsSync(DROPSHIP_PATH)) return emptyData();
  try {
    return JSON.parse(fs.readFileSync(DROPSHIP_PATH, "utf-8")) as DropshippingData;
  } catch {
    return emptyData();
  }
}

function writeData(data: DropshippingData) {
  ensureDataDir();
  fs.writeFileSync(DROPSHIP_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ─── Helpers ──────────────────────────────────────────────────────────────

let idCounter = Date.now();
function nextId(prefix: string): string {
  return `${prefix}-${(idCounter++).toString(36)}`;
}

// ─── Products ─────────────────────────────────────────────────────────────

export function createProduct(input: { name: string; description?: string; price: number; cost: number; supplierId?: string | null; category?: string }): Product {
  const data = readData();
  const product: Product = {
    productId: nextId("prod"),
    name: input.name,
    description: input.description ?? "",
    price: input.price,
    cost: input.cost,
    supplierId: input.supplierId ?? null,
    category: input.category ?? "general",
    status: "active",
    imageUrl: null,
    createdAt: new Date().toISOString(),
  };
  data.products.push(product);
  writeData(data);
  return product;
}

export function listProducts(): Product[] {
  return readData().products;
}

// ─── Suppliers ─────────────────────────────────────────────────────────────

export function createSupplier(input: { name: string; contact: string; country?: string }): Supplier {
  const data = readData();
  const supplier: Supplier = {
    supplierId: nextId("sup"),
    name: input.name,
    contact: input.contact,
    country: input.country ?? "China",
    status: "active",
    rating: 0,
    createdAt: new Date().toISOString(),
  };
  data.suppliers.push(supplier);
  writeData(data);
  return supplier;
}

export function listSuppliers(): Supplier[] {
  return readData().suppliers;
}

// ─── Orders ───────────────────────────────────────────────────────────────

export function createOrder(input: { productId: string; customerName: string; customerEmail?: string | null; quantity?: number }): Order | null {
  const data = readData();
  const product = data.products.find((p) => p.productId === input.productId);
  if (!product) return null;

  const quantity = input.quantity ?? 1;
  const totalAmount = Math.round(product.price * quantity * 100) / 100;
  const now = new Date().toISOString();

  const order: Order = {
    orderId: nextId("ord"),
    productId: input.productId,
    supplierId: product.supplierId,
    customerName: input.customerName,
    customerEmail: input.customerEmail ?? null,
    quantity,
    unitPrice: product.price,
    totalAmount,
    status: "pending",
    trackingNumber: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
  data.orders.push(order);
  writeData(data);
  return order;
}

export function updateOrderStatus(orderId: string, status: OrderStatus, tracking?: string): Order | null {
  const data = readData();
  const idx = data.orders.findIndex((o) => o.orderId === orderId);
  if (idx === -1) return null;
  data.orders[idx] = {
    ...data.orders[idx],
    status,
    trackingNumber: tracking ?? data.orders[idx].trackingNumber,
    updatedAt: new Date().toISOString(),
  };
  writeData(data);
  return data.orders[idx];
}

export function listOrders(): Order[] {
  return readData().orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ─── Overview ─────────────────────────────────────────────────────────────

export function getDropshippingOverview(): DropshippingOverview {
  const data = readData();
  const ordersByStatus: Record<OrderStatus, number> = { pending: 0, ordered: 0, shipped: 0, delivered: 0, issue: 0 };
  for (const o of data.orders) ordersByStatus[o.status]++;

  const revenue = data.orders.filter((o) => o.status !== "issue").reduce((sum, o) => sum + o.totalAmount, 0);
  const cost = data.orders.filter((o) => o.status !== "issue").reduce((sum, o) => {
    const product = data.products.find((p) => p.productId === o.productId);
    return sum + (product?.cost ?? 0) * o.quantity;
  }, 0);

  return {
    totalProducts: data.products.length,
    activeProducts: data.products.filter((p) => p.status === "active").length,
    totalSuppliers: data.suppliers.length,
    activeSuppliers: data.suppliers.filter((s) => s.status === "active").length,
    totalOrders: data.orders.length,
    ordersByStatus,
    revenue: Math.round(revenue * 100) / 100,
    cost: Math.round(cost * 100) / 100,
    profit: Math.round((revenue - cost) * 100) / 100,
  };
}
