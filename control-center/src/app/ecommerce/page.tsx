"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  DollarSign,
  Package,
  PackageCheck,
  PackageSearch,
  Plus,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Star,
  Truck,
  Users,
  X,
} from "lucide-react";
import {
  EmptyState,
  ErrorBanner,
  GhostButton,
  LocalBadge,
  PageHeader,
  Panel,
  PrimaryButton,
  Row,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────

type ProductStatus = "active" | "out_of_stock" | "discontinued";
type OrderStatus = "pending" | "ordered" | "shipped" | "delivered" | "issue";
type SupplierStatus = "active" | "on_hold" | "discontinued";

interface Product {
  productId: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  supplierId: string | null;
  category: string;
  status: ProductStatus;
  createdAt: string;
}

interface Supplier {
  supplierId: string;
  name: string;
  contact: string;
  country: string;
  status: SupplierStatus;
  rating: number;
  createdAt: string;
}

interface Order {
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

interface DropshippingOverview {
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

type ActiveTab = "overview" | "products" | "orders" | "suppliers";

// ─── Helpers ──────────────────────────────────────────────────────────────

const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "#f59e0b",
  ordered: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#22c55e",
  issue: "#f43f5e",
};

const ORDER_STATUS_ICON: Record<OrderStatus, React.ReactNode> = {
  pending: <ShoppingCart size={10} />,
  ordered: <Package size={10} />,
  shipped: <Truck size={10} />,
  delivered: <PackageCheck size={10} />,
  issue: <AlertTriangle size={10} />,
};

const SUPPLIER_STATUS_COLOR: Record<SupplierStatus, string> = {
  active: "#22c55e",
  on_hold: "#f59e0b",
  discontinued: "#f43f5e",
};

function margin(price: number, cost: number): number {
  if (price === 0) return 0;
  return Math.round(((price - cost) / price) * 100);
}

// ─── Add Product Modal ────────────────────────────────────────────────────

function AddProductModal({
  suppliers,
  onAdd,
  onClose,
}: {
  suppliers: Supplier[];
  onAdd: (data: { name: string; description: string; price: number; cost: number; supplierId: string | null; category: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState("general");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inputStyle = {
    padding: "6px 10px", fontSize: 12,
    background: "var(--bg-2)", border: "1px solid var(--border)",
    borderRadius: 6, color: "var(--text)", outline: "none", width: "100%",
  };
  const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "var(--text-2)", marginBottom: 3, display: "block" };

  const handleSubmit = async () => {
    if (!name || !price || !cost) return;
    setSaving(true);
    onAdd({ name, description, price: parseFloat(price), cost: parseFloat(cost), supplierId, category });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: 24, width: 420, maxWidth: "90vw",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Add Product</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={labelStyle}>Product Name *</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="LED Strip Lights" />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={labelStyle}>Selling Price *</label>
              <input style={inputStyle} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="29.99" />
            </div>
            <div>
              <label style={labelStyle}>Cost Price *</label>
              <input style={inputStyle} type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="8.50" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={labelStyle}>Category</label>
              <input style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="electronics" />
            </div>
            <div>
              <label style={labelStyle}>Supplier</label>
              <select style={inputStyle} value={supplierId ?? ""} onChange={(e) => setSupplierId(e.target.value || null)}>
                <option value="">No supplier</option>
                {suppliers.map((s) => <option key={s.supplierId} value={s.supplierId}>{s.name}</option>)}
              </select>
            </div>
          </div>
          {price && cost && (
            <div style={{ fontSize: 11, color: "#22c55e", padding: "6px 10px", background: "rgba(34,197,94,0.08)", borderRadius: 6 }}>
              Margin: {margin(parseFloat(price || "0"), parseFloat(cost || "0"))}% — Profit per unit: ${(parseFloat(price || "0") - parseFloat(cost || "0")).toFixed(2)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={handleSubmit} disabled={saving || !name || !price || !cost} color="#22c55e">
            <Plus size={11} /> {saving ? "Adding..." : "Add Product"}
          </PrimaryButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Add Supplier Modal ───────────────────────────────────────────────────

function AddSupplierModal({
  onAdd,
  onClose,
}: {
  onAdd: (data: { name: string; contact: string; country: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [country, setCountry] = useState("China");
  const [saving, setSaving] = useState(false);

  const inputStyle = {
    padding: "6px 10px", fontSize: 12,
    background: "var(--bg-2)", border: "1px solid var(--border)",
    borderRadius: 6, color: "var(--text)", outline: "none", width: "100%",
  };
  const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "var(--text-2)", marginBottom: 3, display: "block" };

  const handleSubmit = () => {
    if (!name || !contact) return;
    setSaving(true);
    onAdd({ name, contact, country });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: 24, width: 380, maxWidth: "90vw",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Add Supplier</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={labelStyle}>Supplier Name *</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Shenzhen Electronics" />
          </div>
          <div>
            <label style={labelStyle}>Contact (email or phone) *</label>
            <input style={inputStyle} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="sales@supplier.com" />
          </div>
          <div>
            <label style={labelStyle}>Country</label>
            <input style={inputStyle} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="China" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={handleSubmit} disabled={saving || !name || !contact} color="#3b82f6">
            <Plus size={11} /> {saving ? "Adding..." : "Add Supplier"}
          </PrimaryButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Create Order Modal ───────────────────────────────────────────────────

function CreateOrderModal({
  products,
  onAdd,
  onClose,
}: {
  products: Product[];
  onAdd: (data: { productId: string; customerName: string; customerEmail: string | null; quantity: number }) => void;
  onClose: () => void;
}) {
  const [productId, setProductId] = useState(products[0]?.productId ?? "");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find((p) => p.productId === productId);

  const inputStyle = {
    padding: "6px 10px", fontSize: 12,
    background: "var(--bg-2)", border: "1px solid var(--border)",
    borderRadius: 6, color: "var(--text)", outline: "none", width: "100%",
  };
  const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "var(--text-2)", marginBottom: 3, display: "block" };

  const handleSubmit = () => {
    if (!productId || !customerName) return;
    setSaving(true);
    onAdd({ productId, customerName, customerEmail: customerEmail || null, quantity: parseInt(quantity) || 1 });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: 24, width: 400, maxWidth: "90vw",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Create Order</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={labelStyle}>Product *</label>
            <select style={inputStyle} value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.filter((p) => p.status === "active").map((p) => (
                <option key={p.productId} value={p.productId}>{p.name} — ${p.price}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Customer Name *</label>
            <input style={inputStyle} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Jean Tremblay" />
          </div>
          <div>
            <label style={labelStyle}>Customer Email</label>
            <input style={inputStyle} type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="client@email.com" />
          </div>
          <div>
            <label style={labelStyle}>Quantity</label>
            <input style={inputStyle} type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          {selectedProduct && (
            <div style={{ fontSize: 11, color: "#3b82f6", padding: "6px 10px", background: "rgba(59,130,246,0.08)", borderRadius: 6 }}>
              Total: ${(selectedProduct.price * (parseInt(quantity) || 1)).toFixed(2)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={handleSubmit} disabled={saving || !productId || !customerName} color="#8b5cf6">
            <ShoppingCart size={11} /> {saving ? "Creating..." : "Create Order"}
          </PrimaryButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function EcommercePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [overview, setOverview] = useState<DropshippingOverview | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovRes, prRes, orRes, spRes] = await Promise.all([
        fetch("/api/ecommerce/overview"),
        fetch("/api/ecommerce/products"),
        fetch("/api/ecommerce/orders"),
        fetch("/api/ecommerce/suppliers"),
      ]);
      if (ovRes.ok) { const d = await ovRes.json(); setOverview(d.overview); }
      if (prRes.ok) { const d = await prRes.json(); setProducts(d.products ?? []); }
      if (orRes.ok) { const d = await orRes.json(); setOrders(d.orders ?? []); }
      if (spRes.ok) { const d = await spRes.json(); setSuppliers(d.suppliers ?? []); }
      setError(null);
    } catch {
      setError("Failed to load ecommerce data");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleAddProduct = async (data: { name: string; description: string; price: number; cost: number; supplierId: string | null; category: string }) => {
    try {
      const res = await fetch("/api/ecommerce/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowAddProduct(false);
        loadData();
      }
    } catch { /* */ }
  };

  const handleAddSupplier = async (data: { name: string; contact: string; country: string }) => {
    try {
      const res = await fetch("/api/ecommerce/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowAddSupplier(false);
        loadData();
      }
    } catch { /* */ }
  };

  const handleCreateOrder = async (data: { productId: string; customerName: string; customerEmail: string | null; quantity: number }) => {
    try {
      const res = await fetch("/api/ecommerce/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowCreateOrder(false);
        loadData();
      }
    } catch { /* */ }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus, tracking?: string) => {
    setUpdatingOrder(orderId);
    try {
      const res = await fetch("/api/ecommerce/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status, tracking }),
      });
      if (res.ok) loadData();
    } catch { /* */ }
    setUpdatingOrder(null);
  };

  const issueOrders = orders.filter((o) => o.status === "issue");
  const pendingOrders = orders.filter((o) => o.status === "pending");

  const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <ShoppingBag size={12} /> },
    { id: "products", label: `Products (${products.length})`, icon: <Box size={12} /> },
    { id: "orders", label: `Orders (${orders.length})`, icon: <ShoppingCart size={12} /> },
    { id: "suppliers", label: `Suppliers (${suppliers.length})`, icon: <Users size={12} /> },
  ];

  const tabStyle = (id: ActiveTab) => ({
    display: "flex", alignItems: "center", gap: 5,
    padding: "6px 14px", fontSize: 12, fontWeight: 600,
    background: activeTab === id ? "var(--accent-dim)" : "transparent",
    border: "1px solid",
    borderColor: activeTab === id ? "var(--accent)" : "transparent",
    borderRadius: 8, color: activeTab === id ? "var(--accent-light)" : "var(--text-3)",
    cursor: "pointer", transition: "all 140ms",
  });

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
      <PageHeader
        icon={<ShoppingBag size={20} />}
        title="E-Commerce Operator"
        description="Dropshipping products, orders, suppliers and profit tracking"
        badge={<LocalBadge />}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <GhostButton onClick={loadData}><RefreshCw size={11} /> Refresh</GhostButton>
            <GhostButton onClick={() => setShowCreateOrder(true)}><ShoppingCart size={11} /> New Order</GhostButton>
            <PrimaryButton onClick={() => setShowAddProduct(true)} color="#22c55e"><Plus size={11} /> Add Product</PrimaryButton>
          </div>
        }
      />

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* Issue alerts */}
      {issueOrders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: 16, padding: "10px 14px",
            background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.3)",
            borderRadius: 8, display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <AlertTriangle size={14} style={{ color: "#f43f5e", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#f43f5e", fontWeight: 600 }}>
            {issueOrders.length} order{issueOrders.length > 1 ? "s" : ""} require attention:
          </span>
          <span style={{ fontSize: 12, color: "var(--text-2)" }}>
            {issueOrders.map((o) => o.customerName).join(", ")}
          </span>
          <span style={{ marginLeft: "auto" }}><GhostButton onClick={() => setActiveTab("orders")}>View Orders</GhostButton></span>
        </motion.div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {TABS.map((tab) => (
          <button key={tab.id} style={tabStyle(tab.id)} onClick={() => setActiveTab(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >

          {/* ── Overview Tab ── */}
          {activeTab === "overview" && (
            <div>
              {/* Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Products", value: overview?.activeProducts ?? 0, total: overview?.totalProducts, color: "#3b82f6", icon: <Box size={16} /> },
                  { label: "Orders", value: overview?.totalOrders ?? 0, color: "#8b5cf6", icon: <ShoppingCart size={16} /> },
                  { label: "Revenue", value: `$${(overview?.revenue ?? 0).toFixed(2)}`, color: "#22c55e", icon: <DollarSign size={16} /> },
                  { label: "Profit", value: `$${(overview?.profit ?? 0).toFixed(2)}`, color: "#f59e0b", icon: <Star size={16} /> },
                ].map((m) => (
                  <div key={m.label} style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 10, padding: "16px 18px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ color: m.color }}>{m.icon}</span>
                      <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{m.label}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{m.value}</div>
                    {m.total !== undefined && (
                      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{m.total} total</div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Order Status Breakdown */}
                <Panel>
                  <SectionHeader title="Order Status" icon={<ShoppingCart size={12} />} />
                  {overview ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {(Object.entries(overview.ordersByStatus) as [OrderStatus, number][]).map(([status, count]) => (
                        <Row key={status}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                            <span style={{ color: ORDER_STATUS_COLOR[status] }}>{ORDER_STATUS_ICON[status]}</span>
                            <span style={{ fontSize: 12, color: "var(--text-2)", textTransform: "capitalize" }}>{status}</span>
                          </div>
                          <StatusBadge label={String(count)} color={ORDER_STATUS_COLOR[status]} />
                        </Row>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>Loading...</div>
                  )}
                </Panel>

                {/* Profit Overview */}
                <Panel>
                  <SectionHeader title="Profit Overview" icon={<DollarSign size={12} />} />
                  {overview ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[
                        { label: "Revenue", value: overview.revenue, color: "#3b82f6" },
                        { label: "Cost", value: overview.cost, color: "#f43f5e" },
                        { label: "Profit", value: overview.profit, color: "#22c55e" },
                      ].map((item) => (
                        <div key={item.label}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 11, color: "var(--text-2)" }}>{item.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>${item.value.toFixed(2)}</span>
                          </div>
                          <div style={{ height: 4, background: "var(--border)", borderRadius: 2 }}>
                            <div style={{
                              height: "100%", borderRadius: 2,
                              background: item.color,
                              width: overview.revenue > 0 ? `${Math.min((item.value / overview.revenue) * 100, 100)}%` : "0%",
                              transition: "width 600ms ease",
                            }} />
                          </div>
                        </div>
                      ))}
                      {overview.revenue > 0 && (
                        <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, paddingTop: 4 }}>
                          Profit margin: {Math.round((overview.profit / overview.revenue) * 100)}%
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>Loading...</div>
                  )}
                </Panel>
              </div>

              {/* Pending Actions */}
              {pendingOrders.length > 0 && (
                <Panel style={{ marginTop: 16 }}>
                  <SectionHeader title={`Pending Orders (${pendingOrders.length})`} icon={<AlertTriangle size={12} style={{ color: "#f59e0b" }} />} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {pendingOrders.slice(0, 5).map((order) => {
                      const product = products.find((p) => p.productId === order.productId);
                      return (
                        <Row key={order.orderId}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{order.customerName}</div>
                            <div style={{ fontSize: 10, color: "var(--text-3)" }}>{product?.name ?? order.productId} × {order.quantity}</div>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>${order.totalAmount.toFixed(2)}</span>
                          <PrimaryButton
                            onClick={() => handleUpdateOrderStatus(order.orderId, "ordered")}
                            disabled={updatingOrder === order.orderId}
                            color="#3b82f6"
                          >
                            <Package size={10} /> Mark Ordered
                          </PrimaryButton>
                        </Row>
                      );
                    })}
                  </div>
                </Panel>
              )}
            </div>
          )}

          {/* ── Products Tab ── */}
          {activeTab === "products" && (
            <Panel>
              <SectionHeader
                title="Products"
                icon={<Box size={12} />}
                action={<PrimaryButton onClick={() => setShowAddProduct(true)} color="#22c55e"><Plus size={11} /> Add Product</PrimaryButton>}
              />
              {products.length === 0 ? (
                <EmptyState
                  icon={<PackageSearch size={24} />}
                  title="No products yet"
                  description="Add your first dropshipping product to start selling"
                  action={<PrimaryButton onClick={() => setShowAddProduct(true)} color="#22c55e"><Plus size={11} /> Add Product</PrimaryButton>}
                />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["Product", "Category", "Price", "Cost", "Margin", "Status"].map((h) => (
                          <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <motion.tr
                          key={p.productId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          style={{ borderBottom: "1px solid var(--border)" }}
                        >
                          <td style={{ padding: "8px 8px" }}>
                            <div style={{ fontWeight: 600, color: "var(--text)" }}>{p.name}</div>
                            {p.description && <div style={{ fontSize: 10, color: "var(--text-3)" }}>{p.description}</div>}
                          </td>
                          <td style={{ padding: "8px 8px", color: "var(--text-2)" }}>{p.category}</td>
                          <td style={{ padding: "8px 8px", fontWeight: 700, color: "#22c55e" }}>${p.price.toFixed(2)}</td>
                          <td style={{ padding: "8px 8px", color: "#f43f5e" }}>${p.cost.toFixed(2)}</td>
                          <td style={{ padding: "8px 8px" }}>
                            <span style={{ color: margin(p.price, p.cost) >= 50 ? "#22c55e" : margin(p.price, p.cost) >= 30 ? "#f59e0b" : "#f43f5e", fontWeight: 700 }}>
                              {margin(p.price, p.cost)}%
                            </span>
                          </td>
                          <td style={{ padding: "8px 8px" }}>
                            <StatusBadge
                              label={p.status}
                              color={p.status === "active" ? "#22c55e" : p.status === "out_of_stock" ? "#f59e0b" : "#f43f5e"}
                            />
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}

          {/* ── Orders Tab ── */}
          {activeTab === "orders" && (
            <Panel>
              <SectionHeader
                title="Orders"
                icon={<ShoppingCart size={12} />}
                action={<PrimaryButton onClick={() => setShowCreateOrder(true)} color="#8b5cf6"><Plus size={11} /> New Order</PrimaryButton>}
              />
              {orders.length === 0 ? (
                <EmptyState
                  icon={<ShoppingCart size={24} />}
                  title="No orders yet"
                  description="Create your first order when a customer purchases a product"
                  action={<PrimaryButton onClick={() => setShowCreateOrder(true)} color="#8b5cf6"><ShoppingCart size={11} /> Create Order</PrimaryButton>}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {orders.map((order) => {
                    const product = products.find((p) => p.productId === order.productId);
                    const statusOrder: OrderStatus[] = ["pending", "ordered", "shipped", "delivered", "issue"];
                    const currentIdx = statusOrder.indexOf(order.status);
                    return (
                      <motion.div
                        key={order.orderId}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          padding: "12px 14px",
                          background: order.status === "issue" ? "rgba(244,63,94,0.05)" : "var(--bg-2)",
                          border: `1px solid ${order.status === "issue" ? "rgba(244,63,94,0.3)" : "var(--border)"}`,
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{order.customerName}</div>
                            <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                              {product?.name ?? order.productId} × {order.quantity}
                              {order.customerEmail && ` — ${order.customerEmail}`}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>${order.totalAmount.toFixed(2)}</span>
                            <StatusBadge label={order.status} color={ORDER_STATUS_COLOR[order.status]} icon={ORDER_STATUS_ICON[order.status]} />
                          </div>
                        </div>

                        {/* Status progress */}
                        <div style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 8 }}>
                          {["pending", "ordered", "shipped", "delivered"].map((s, i) => (
                            <div key={s} style={{ display: "flex", alignItems: "center" }}>
                              <div style={{
                                width: 8, height: 8, borderRadius: "50%",
                                background: i <= currentIdx && order.status !== "issue" ? ORDER_STATUS_COLOR[order.status as OrderStatus] : "var(--border)",
                              }} />
                              {i < 3 && <div style={{ width: 20, height: 2, background: i < currentIdx && order.status !== "issue" ? ORDER_STATUS_COLOR[order.status as OrderStatus] : "var(--border)" }} />}
                            </div>
                          ))}
                        </div>

                        {order.trackingNumber && (
                          <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 6 }}>
                            Tracking: {order.trackingNumber}
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {order.status === "pending" && (
                            <PrimaryButton onClick={() => handleUpdateOrderStatus(order.orderId, "ordered")} disabled={updatingOrder === order.orderId} color="#3b82f6">
                              <Package size={10} /> Mark Ordered
                            </PrimaryButton>
                          )}
                          {order.status === "ordered" && (
                            <PrimaryButton onClick={() => handleUpdateOrderStatus(order.orderId, "shipped")} disabled={updatingOrder === order.orderId} color="#8b5cf6">
                              <Truck size={10} /> Mark Shipped
                            </PrimaryButton>
                          )}
                          {order.status === "shipped" && (
                            <PrimaryButton onClick={() => handleUpdateOrderStatus(order.orderId, "delivered")} disabled={updatingOrder === order.orderId} color="#22c55e">
                              <PackageCheck size={10} /> Mark Delivered
                            </PrimaryButton>
                          )}
                          {order.status !== "delivered" && order.status !== "issue" && (
                            <GhostButton onClick={() => handleUpdateOrderStatus(order.orderId, "issue")} disabled={updatingOrder === order.orderId}>
                              <AlertTriangle size={10} /> Flag Issue
                            </GhostButton>
                          )}
                          {order.status === "issue" && (
                            <PrimaryButton onClick={() => handleUpdateOrderStatus(order.orderId, "pending")} disabled={updatingOrder === order.orderId} color="#f59e0b">
                              <RefreshCw size={10} /> Retry
                            </PrimaryButton>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </Panel>
          )}

          {/* ── Suppliers Tab ── */}
          {activeTab === "suppliers" && (
            <Panel>
              <SectionHeader
                title="Suppliers"
                icon={<Users size={12} />}
                action={<PrimaryButton onClick={() => setShowAddSupplier(true)} color="#3b82f6"><Plus size={11} /> Add Supplier</PrimaryButton>}
              />
              {suppliers.length === 0 ? (
                <EmptyState
                  icon={<Users size={24} />}
                  title="No suppliers yet"
                  description="Add a supplier to start sourcing products"
                  action={<PrimaryButton onClick={() => setShowAddSupplier(true)} color="#3b82f6"><Plus size={11} /> Add Supplier</PrimaryButton>}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {suppliers.map((supplier) => (
                    <Row key={supplier.supplierId}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{supplier.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{supplier.contact} — {supplier.country}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={9} style={{ color: i < supplier.rating ? "#f59e0b" : "var(--border)" }} fill={i < supplier.rating ? "#f59e0b" : "none"} />
                        ))}
                      </div>
                      <StatusBadge label={supplier.status} color={SUPPLIER_STATUS_COLOR[supplier.status]} />
                    </Row>
                  ))}
                </div>
              )}
            </Panel>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showAddProduct && (
          <AddProductModal suppliers={suppliers} onAdd={handleAddProduct} onClose={() => setShowAddProduct(false)} />
        )}
        {showAddSupplier && (
          <AddSupplierModal onAdd={handleAddSupplier} onClose={() => setShowAddSupplier(false)} />
        )}
        {showCreateOrder && products.filter((p) => p.status === "active").length > 0 && (
          <CreateOrderModal products={products} onAdd={handleCreateOrder} onClose={() => setShowCreateOrder(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
