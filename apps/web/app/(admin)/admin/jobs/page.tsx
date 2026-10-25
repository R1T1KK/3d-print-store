"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Layers,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Box,
  FileCode,
  X,
} from "lucide-react";

// Dynamically import 3D viewer to avoid server hydration issues
const AdminMeshViewer = dynamic(
  () => import("@/components/admin/AdminMeshViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[360px] bg-zinc-950 rounded-xl flex items-center justify-center text-zinc-500 font-mono text-xs">
        Initializing 3D WebGL Canvas...
      </div>
    ),
  }
);

interface CustomJob {
  id: string;
  jobStatus: "SUBMITTED" | "APPROVED" | "REJECTED";
  adminNote?: string | null;
  material: string;
  color: string;
  infillPct: number;
  layerHeight: number;
  quantity: number;
  priceTotalPaise: number;
  priceTotalInr: number;
  breakdown: Record<string, unknown>;
  expiresAt: string;
  model: {
    id: string;
    fileName: string;
    fileSize: number;
    fileKey: string;
    status: string;
    volumeMm3?: number | null;
    volumeCm3?: number | null;
    sizeXmm?: number | null;
    sizeYmm?: number | null;
    sizeZmm?: number | null;
    isWatertight?: boolean | null;
    meshReport?: Record<string, unknown> | null;
    createdAt: string;
    customer: {
      id?: string;
      email: string;
      name: string;
    };
  };
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<CustomJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUBMITTED" | "APPROVED" | "REJECTED">("ALL");

  // Inspection Drawer State
  const [selectedJob, setSelectedJob] = useState<CustomJob | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectPromptOpen, setRejectPromptOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const reloadJobs = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/jobs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load jobs.");
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err: unknown) {
      console.error("Jobs load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (search.trim()) params.set("search", search.trim());

        const res = await fetch(`/api/admin/jobs?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load jobs.");
        const data = await res.json();
        if (!ignore) {
          setJobs(data.jobs || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Jobs load error:", err);
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [statusFilter, search]);

  const handleApprove = async (jobId: string) => {
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobStatus: "APPROVED",
          adminNote: "Geometry validated. Slicing tolerances approved for production.",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed.");

      setToastMessage(`Custom print job approved successfully.`);
      setTimeout(() => setToastMessage(null), 4000);
      setSelectedJob(null);
      reloadJobs();
    } catch (err: unknown) {
      setActionError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (jobId: string) => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      setActionError("Please provide a detailed rejection reason (minimum 5 characters).");
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobStatus: "REJECTED",
          adminNote: rejectionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rejection failed.");

      setToastMessage(`Custom print job marked as REJECTED.`);
      setTimeout(() => setToastMessage(null), 4000);
      setRejectPromptOpen(false);
      setRejectionReason("");
      setSelectedJob(null);
      reloadJobs();
    } catch (err: unknown) {
      setActionError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const submittedCount = jobs.filter((j) => j.jobStatus === "SUBMITTED").length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <span>Custom Print Job Review Queue</span>
            {submittedCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800/60 font-mono">
                {submittedCount} Pending
              </span>
            )}
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Inspect uploaded customer STL/OBJ geometry in 3D, verify manifold integrity, and approve for manufacturing.
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(["ALL", "SUBMITTED", "APPROVED", "REJECTED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                statusFilter === tab
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/40"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
            >
              {tab === "ALL" ? "All Jobs" : tab}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>
      </div>

      {/* Custom Jobs Table */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[11px] font-mono uppercase text-zinc-400">
              <tr>
                <th className="py-3 px-4">Model File & Customer</th>
                <th className="py-3 px-4">Print Configuration</th>
                <th className="py-3 px-4">Dimensions & Volume</th>
                <th className="py-3 px-4 text-center">Watertight</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    Loading custom job queue...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    No custom jobs matched the selected filter.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-900/40 transition-colors">
                    {/* Model File & Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-100 flex items-center gap-2">
                        <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{job.model.fileName}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        {job.model.customer.email}
                      </div>
                      <div className="text-[10px] text-zinc-600 font-mono mt-0.5">
                        Submitted: {new Date(job.model.createdAt).toLocaleString()}
                      </div>
                    </td>

                    {/* Print Configuration */}
                    <td className="py-3.5 px-4">
                      <div className="text-zinc-200 font-medium">
                        {job.material} · <span className="text-zinc-400">{job.color}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        Infill: {job.infillPct}% · {job.layerHeight}mm
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Qty: {job.quantity} unit(s)
                      </div>
                    </td>

                    {/* Dimensions & Volume */}
                    <td className="py-3.5 px-4 font-mono text-zinc-300">
                      <div>
                        {job.model.sizeXmm && job.model.sizeYmm && job.model.sizeZmm
                          ? `${job.model.sizeXmm} × ${job.model.sizeYmm} × ${job.model.sizeZmm} mm`
                          : "Dimensions pending"}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {job.model.volumeCm3 ? `${job.model.volumeCm3} cm³` : "Volume N/A"}
                      </div>
                    </td>

                    {/* Watertight */}
                    <td className="py-3.5 px-4 text-center">
                      {job.model.isWatertight === true ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                          <CheckCircle2 className="w-3 h-3" /> Manifold
                        </span>
                      ) : job.model.isWatertight === false ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800/60">
                          <XCircle className="w-3 h-3" /> Non-Manifold
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          Pending Check
                        </span>
                      )}
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-100 text-sm">
                      ₹{job.priceTotalInr}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded border ${
                          job.jobStatus === "APPROVED"
                            ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
                            : job.jobStatus === "REJECTED"
                            ? "bg-rose-950/80 text-rose-400 border-rose-800/60"
                            : "bg-amber-950/80 text-amber-400 border-amber-800/60"
                        }`}
                      >
                        {job.jobStatus}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-cyan-500 text-cyan-400 transition-colors inline-flex items-center gap-1.5 font-mono"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3D Model Inspection Drawer / Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Custom Print Engineering Review</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      selectedJob.jobStatus === "APPROVED"
                        ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                        : selectedJob.jobStatus === "REJECTED"
                        ? "bg-rose-950 text-rose-400 border-rose-800"
                        : "bg-amber-950 text-amber-400 border-amber-800"
                    }`}
                  >
                    {selectedJob.jobStatus}
                  </span>
                </h2>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  File: {selectedJob.model.fileName} · Customer: {selectedJob.model.customer.email}
                </p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {actionError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {actionError}
                </div>
              )}

              {/* 3D Viewer Container */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Interactive 3D Geometry Workspace (220×220 mm Bed)</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Left Drag: Orbit · Right Drag: Pan · Scroll: Zoom
                  </span>
                </div>
                <AdminMeshViewer
                  modelId={selectedJob.model.id}
                  fileName={selectedJob.model.fileName}
                  dimensions={{
                    x: selectedJob.model.sizeXmm,
                    y: selectedJob.model.sizeYmm,
                    z: selectedJob.model.sizeZmm,
                  }}
                />
              </div>

              {/* Telemetry & Quoting Diagnostics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Panel 1: Geometric Diagnostics */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2.5">
                  <h3 className="text-xs font-bold text-zinc-200 uppercase font-mono tracking-wider">
                    Mesh Diagnostics & Bed Fit
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="text-zinc-500">Dimensions:</div>
                    <div className="text-zinc-200 text-right">
                      {selectedJob.model.sizeXmm && selectedJob.model.sizeYmm && selectedJob.model.sizeZmm
                        ? `${selectedJob.model.sizeXmm} × ${selectedJob.model.sizeYmm} × ${selectedJob.model.sizeZmm} mm`
                        : "N/A"}
                    </div>
                    <div className="text-zinc-500">Mesh Volume:</div>
                    <div className="text-zinc-200 text-right">
                      {selectedJob.model.volumeCm3
                        ? `${selectedJob.model.volumeCm3} cm³ (${selectedJob.model.volumeMm3?.toLocaleString()} mm³)`
                        : "Calculated client-side"}
                    </div>
                    <div className="text-zinc-500">Printer Limits:</div>
                    <div className="text-emerald-400 text-right">
                      Within 220×220×250mm ✓
                    </div>
                    <div className="text-zinc-500">Manifold Check:</div>
                    <div className="text-right">
                      {selectedJob.model.isWatertight === true ? (
                        <span className="text-emerald-400">Watertight ✓</span>
                      ) : selectedJob.model.isWatertight === false ? (
                        <span className="text-rose-400">Non-Watertight ⚠</span>
                      ) : (
                        <span className="text-amber-400">Warning Checked</span>
                      )}
                    </div>
                    <div className="text-zinc-500">File Size:</div>
                    <div className="text-zinc-300 text-right">
                      {(selectedJob.model.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                </div>

                {/* Panel 2: Slicing Configuration & Pricing */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2.5">
                  <h3 className="text-xs font-bold text-zinc-200 uppercase font-mono tracking-wider">
                    Slicing Parameters & Quote Breakdown
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="text-zinc-500">Material & Color:</div>
                    <div className="text-zinc-200 text-right">
                      {selectedJob.material} ({selectedJob.color})
                    </div>
                    <div className="text-zinc-500">Infill Density:</div>
                    <div className="text-zinc-200 text-right">{selectedJob.infillPct}%</div>
                    <div className="text-zinc-500">Layer Height:</div>
                    <div className="text-zinc-200 text-right">{selectedJob.layerHeight} mm</div>
                    <div className="text-zinc-500">Order Quantity:</div>
                    <div className="text-zinc-200 text-right">{selectedJob.quantity} unit(s)</div>
                    <div className="text-zinc-500">Quote Expiry:</div>
                    <div className="text-zinc-300 text-right">
                      {new Date(selectedJob.expiresAt).toLocaleDateString()}
                    </div>
                    <div className="text-zinc-500 font-bold border-t border-zinc-800 pt-1">Total Price:</div>
                    <div className="text-cyan-400 font-bold text-right border-t border-zinc-800 pt-1 text-sm">
                      ₹{selectedJob.priceTotalInr}
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Note if already approved/rejected */}
              {selectedJob.adminNote && (
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs">
                  <div className="text-zinc-400 font-mono uppercase text-[10px] mb-1">
                    Recorded Engineer Note:
                  </div>
                  <p className="text-zinc-200 font-sans">{selectedJob.adminNote}</p>
                </div>
              )}

              {/* Rejection Reason Form */}
              {rejectPromptOpen && (
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/50 space-y-3">
                  <label className="block text-xs font-semibold text-rose-300">
                    Mandatory Rejection Note for Customer:
                  </label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Inverted face normals and non-manifold holes detected. Please repair non-planar boundaries in CAD and re-upload."
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-rose-800/60 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setRejectPromptOpen(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(selectedJob.id)}
                      disabled={actionLoading}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50"
                    >
                      {actionLoading ? "Submitting..." : "Confirm Rejection"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
              <span className="text-xs text-zinc-500 font-mono">
                Decisions are persisted to database Quote records.
              </span>

              <div className="flex items-center gap-3">
                {!rejectPromptOpen && (
                  <button
                    onClick={() => {
                      setRejectPromptOpen(true);
                      setRejectionReason(selectedJob.adminNote || "");
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-colors"
                  >
                    Reject Job
                  </button>
                )}

                <button
                  onClick={() => handleApprove(selectedJob.id)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors disabled:opacity-50 font-bold"
                >
                  {actionLoading ? "Approving..." : "Approve Job for Production"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
