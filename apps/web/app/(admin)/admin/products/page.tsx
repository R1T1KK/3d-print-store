"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
} from "lucide-react";

interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  basePriceInr: number;
  currency: string;
  stock: number;
  materials: string[];
  images: string[];
  modelUrl?: string | null;
  active: boolean;
}

const MATERIAL_OPTIONS = ["PLA", "PETG", "TPU", "ABS", "Resin", "PLA Tough", "Nylon"];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [materialFilter, setMaterialFilter] = useState<string>("ALL");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    priceInr: 499,
    stock: 20,
    materials: ["PLA", "PETG"],
    images: "",
    modelUrl: "",
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const reloadProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (activeFilter === "ACTIVE") params.set("active", "true");
      if (activeFilter === "INACTIVE") params.set("active", "false");
      if (materialFilter !== "ALL") params.set("material", materialFilter);

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load products.");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err: unknown) {
      console.error("Products load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (activeFilter === "ACTIVE") params.set("active", "true");
        if (activeFilter === "INACTIVE") params.set("active", "false");
        if (materialFilter !== "ALL") params.set("material", materialFilter);

        const res = await fetch(`/api/admin/products?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load products.");
        const data = await res.json();
        if (!ignore) {
          setProducts(data.products || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Products load error:", err);
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [search, activeFilter, materialFilter]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      priceInr: 499,
      stock: 25,
      materials: ["PLA", "PETG"],
      images: "",
      modelUrl: "",
      active: true,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      slug: p.slug,
      description: p.description,
      priceInr: p.basePriceInr,
      stock: p.stock,
      materials: p.materials || ["PLA"],
      images: (p.images || []).join(", "),
      modelUrl: p.modelUrl || "",
      active: p.active,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        description: formData.description.trim(),
        basePriceInr: Number(formData.priceInr),
        stock: Number(formData.stock),
        materials: formData.materials,
        images: formData.images
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        modelUrl: formData.modelUrl.trim() || null,
        active: formData.active,
      };

      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : `/api/admin/products`;
      const method = editingProduct ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save product.");
      }

      setIsModalOpen(false);
      setStatusMessage(
        editingProduct
          ? `Product '${data.product.name}' updated successfully.`
          : `New product '${data.product.name}' created.`
      );
      setTimeout(() => setStatusMessage(null), 4000);
      reloadProducts();
    } catch (err: unknown) {
      setModalError((err as Error).message || "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !product.active }),
      });
      if (!res.ok) throw new Error("Failed to update status.");
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete '${product.name}'?`)) return;

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed.");

      setStatusMessage(data.message);
      setTimeout(() => setStatusMessage(null), 4000);
      reloadProducts();
    } catch (err: unknown) {
      alert((err as Error).message || "Delete error.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <span>Ready-to-Print Product Catalog</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
              {products.length} Items
            </span>
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Manage commercial catalog offerings, inventory quantities, prices, and 3D preview models.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 transition-colors shadow-sm shadow-cyan-950/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Catalog Item</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description or slug..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-mono">Status:</span>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
            className="px-2.5 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-mono">Material:</span>
          <select
            value={materialFilter}
            onChange={(e) => setMaterialFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALL">All Materials</option>
            {MATERIAL_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[11px] font-mono uppercase text-zinc-400">
              <tr>
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-4">Materials</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-center">Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    No products matched your search or filters.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-900/40 transition-colors">
                    {/* Item Details */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-100 flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.modelUrl && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono"
                            title="Interactive 3D preview model available"
                          >
                            3D GLB
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        slug: /{p.slug}
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5 max-w-md">
                        {p.description}
                      </p>
                    </td>

                    {/* Materials */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {p.materials.map((m) => (
                          <span
                            key={m}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-100 text-sm">
                      ₹{p.basePriceInr}
                    </td>

                    {/* Stock */}
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] border ${p.stock > 10
                            ? "bg-zinc-950 text-zinc-300 border-zinc-800"
                            : p.stock > 0
                              ? "bg-amber-950/80 text-amber-400 border-amber-800/60"
                              : "bg-rose-950/80 text-rose-400 border-rose-800/60"
                          }`}
                      >
                        {p.stock} units
                      </span>
                    </td>

                    {/* Active Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(p)}
                        className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${p.active
                            ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/60"
                            : "bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:bg-zinc-800"
                          }`}
                      >
                        {p.active ? "Active" : "Disabled"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800/80 transition-colors"
                          title="Edit product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Box className="w-4 h-4 text-cyan-400" />
                <span>{editingProduct ? "Edit Catalog Item" : "Create New Catalog Item"}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Planetary Gearbox"
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Slug (URL identifier)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="auto-generated from title"
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mechanical specifications, recommended infill and tolerances..."
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Base Price (INR ₹) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.priceInr}
                    onChange={(e) => setFormData({ ...formData, priceInr: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Inventory Stock *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Supported Materials
                </label>
                <div className="flex flex-wrap gap-2">
                  {MATERIAL_OPTIONS.map((mat) => {
                    const isSelected = formData.materials.includes(mat);
                    return (
                      <button
                        type="button"
                        key={mat}
                        onClick={() => {
                          const updated = isSelected
                            ? formData.materials.filter((m) => m !== mat)
                            : [...formData.materials, mat];
                          setFormData({ ...formData, materials: updated });
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-colors ${isSelected
                            ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                            : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                          }`}
                      >
                        {mat} {isSelected ? "✓" : "+"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Preview Model URL (GLB or STL path)
                </label>
                <input
                  type="text"
                  value={formData.modelUrl}
                  onChange={(e) => setFormData({ ...formData, modelUrl: e.target.value })}
                  placeholder="/models/gear.stl or storage key"
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeCheckbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="activeCheckbox" className="text-xs text-zinc-300">
                  Visible in public customer storefront
                </label>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingProduct ? "Update Product" : "Publish to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
