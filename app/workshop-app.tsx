"use client";

import type { CSSProperties, ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Check,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CloudDownload,
  Copy,
  Download,
  FileDown,
  FileText,
  HardDriveUpload,
  Headphones,
  HelpCircle,
  Laptop,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Monitor,
  Moon,
  MoreHorizontal,
  PackageOpen,
  Palette,
  Pencil,
  Plus,
  PlusCircle,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Sun,
  Tablet,
  Trash2,
  Upload,
  UserRound,
  Users,
  WifiOff,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { PwaRegistration, useOnlineStatus, usePwaInstall } from "./pwa-registration";
import type { PwaInstallOutcome } from "./pwa-registration";
import { QUICK_WORK_TEMPLATES } from "./repair-catalog";
import type { BudgetItemCategory, QuickWorkTemplate, ServiceCategory } from "./repair-catalog";
import { downloadWorkshopPdf } from "./pdf-generator";
import { loadWorkspace, saveWorkspace } from "./workspace-storage";

type View = "dashboard" | "orders" | "budgets" | "clients" | "settings";
type Theme = "light" | "dark";
type BudgetStatus = "Borrador" | "Enviado" | "Aprobado" | "Rechazado";
type AdjustmentMode = "amount" | "percent";
type SaveState = "loading" | "saving" | "saved" | "error";
type OrderStatus =
  | "Ingresado"
  | "Diagnosticando"
  | "Esperando aprobación"
  | "En reparación"
  | "Esperando repuesto"
  | "Listo para entregar"
  | "Entregado";

type BudgetItem = {
  id: string;
  detail: string;
  category: BudgetItemCategory;
  qty: number;
  unitPrice: number;
  warranty: number;
};

type RepairOrder = {
  id: string;
  client: string;
  phone: string;
  email: string;
  deviceType: string;
  brand: string;
  model: string;
  serial: string;
  accessories: string;
  condition: string;
  issue: string;
  diagnosis: string;
  work: string;
  technician: string;
  priority: "Normal" | "Alta" | "Urgente";
  status: OrderStatus;
  receivedAt: string;
  dueDate: string;
  estimate: number;
  deposit: number;
  warranty: number;
  result?: string;
  notes?: string;
  items?: BudgetItem[];
  budgetStatus?: BudgetStatus;
  surchargeMode?: AdjustmentMode;
  surchargeValue?: number;
  discountMode?: AdjustmentMode;
  discountValue?: number;
  depositMode?: AdjustmentMode;
  depositValue?: number;
  paymentMethod?: string;
  validityDays?: number;
};

type AppSettings = {
  businessName: string;
  tagline: string;
  ownerName: string;
  phone: string;
  address: string;
  theme: Theme;
  patternUrl: string;
  patternName: string;
  patternOpacity: number;
  patternScale: number;
  customPatternUrl: string;
  customPatternName: string;
};

const STATUS_ORDER: OrderStatus[] = [
  "Ingresado",
  "Diagnosticando",
  "Esperando aprobación",
  "En reparación",
  "Esperando repuesto",
  "Listo para entregar",
  "Entregado",
];

const STATUS_META: Record<OrderStatus, { tone: string; short: string }> = {
  Ingresado: { tone: "slate", short: "Ingresado" },
  Diagnosticando: { tone: "amber", short: "Diagnóstico" },
  "Esperando aprobación": { tone: "violet", short: "Aprobación" },
  "En reparación": { tone: "blue", short: "En reparación" },
  "Esperando repuesto": { tone: "gray", short: "Repuesto" },
  "Listo para entregar": { tone: "green", short: "Listo" },
  Entregado: { tone: "slate", short: "Entregado" },
};

const DEFAULT_SETTINGS: AppSettings = {
  businessName: "TallerOS",
  tagline: "Gestión técnica profesional",
  ownerName: "Técnico",
  phone: "",
  address: "",
  theme: "light",
  patternUrl: "/brand/circuit-pattern-dark.svg",
  patternName: "Circuito",
  patternOpacity: 0.16,
  patternScale: 420,
  customPatternUrl: "",
  customPatternName: "",
};

const INITIAL_ORDERS: RepairOrder[] = [];

const BUILT_IN_PATTERNS = [
  { name: "Circuito", url: "/brand/circuit-pattern-dark.svg", className: "circuit" },
  { name: "Circuito claro", url: "/brand/circuit-pattern-light.svg", className: "circuit-light" },
  { name: "Sin patrón", url: "none", className: "plain" },
];

const BUDGET_STATUSES: BudgetStatus[] = ["Borrador", "Enviado", "Aprobado", "Rechazado"];
const BUDGET_ITEM_CATEGORIES: BudgetItemCategory[] = ["Servicio", "Mano de obra", "Repuesto", "Insumo"];
const TEMPLATE_CATEGORIES: Array<"Todas" | ServiceCategory> = ["Todas", "Celulares", "Computadoras", "Consolas"];

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" });

function formatMoney(value: number) {
  return currency.format(value).replace("ARS", "$ ");
}

function formatDate(value: string) {
  if (!value) return "Sin fecha";
  return shortDate.format(new Date(`${value.slice(0, 10)}T12:00:00`)).replace(".", "");
}

function createItemId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createBudgetItem(detail = "", category: BudgetItemCategory = "Servicio", warranty = 90): BudgetItem {
  return { id: createItemId(), detail, category, qty: 1, unitPrice: 0, warranty };
}

function getOrderItems(order: RepairOrder | null): BudgetItem[] {
  if (!order) return [];
  if (order.items?.length) return order.items.map((item) => ({ ...item }));
  if (order.estimate > 0) {
    return [{ id: createItemId(), detail: "Servicio técnico presupuestado", category: "Servicio", qty: 1, unitPrice: order.estimate, warranty: order.warranty }];
  }
  return [];
}

function adjustmentAmount(mode: AdjustmentMode | undefined, value: number | undefined, base: number) {
  const safeValue = Math.max(0, Number(value) || 0);
  return mode === "percent" ? base * Math.min(100, safeValue) / 100 : safeValue;
}

function calculateFinancials(input: Pick<RepairOrder, "items" | "estimate" | "deposit" | "surchargeMode" | "surchargeValue" | "discountMode" | "discountValue" | "depositMode" | "depositValue">) {
  const subtotal = input.items?.length
    ? input.items.reduce((sum, item) => sum + Math.max(0, item.qty) * Math.max(0, item.unitPrice), 0)
    : Math.max(0, input.estimate || 0);
  const surcharge = adjustmentAmount(input.surchargeMode, input.surchargeValue, subtotal);
  const beforeDiscount = subtotal + surcharge;
  const discount = Math.min(beforeDiscount, adjustmentAmount(input.discountMode, input.discountValue, beforeDiscount));
  const total = Math.max(0, beforeDiscount - discount);
  const deposit = Math.min(total, input.depositValue === undefined
    ? Math.max(0, input.deposit || 0)
    : adjustmentAmount(input.depositMode, input.depositValue, total));
  return { subtotal, surcharge, discount, total, deposit, balance: Math.max(0, total - deposit) };
}

function budgetStatusFor(order: RepairOrder): BudgetStatus {
  if (order.budgetStatus && BUDGET_STATUSES.includes(order.budgetStatus)) return order.budgetStatus;
  if (["En reparación", "Esperando repuesto", "Listo para entregar", "Entregado"].includes(order.status)) return "Aprobado";
  if (order.status === "Esperando aprobación") return "Enviado";
  return "Borrador";
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function deviceLabel(order: RepairOrder) {
  return [order.brand, order.model].filter(Boolean).join(" ") || order.deviceType;
}

function DeviceIcon({ type, size = 20 }: { type: string; size?: number }) {
  const normalized = type.toLowerCase();
  if (normalized.includes("notebook")) return <Laptop size={size} />;
  if (normalized.includes("pc") || normalized.includes("escritorio")) return <Monitor size={size} />;
  if (normalized.includes("tablet")) return <Tablet size={size} />;
  if (normalized.includes("audio")) return <Headphones size={size} />;
  return <Smartphone size={size} />;
}

function sanitizeSvg(source: string) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(source, "image/svg+xml");
  if (documentNode.querySelector("parsererror") || documentNode.documentElement.tagName.toLowerCase() !== "svg") {
    throw new Error("El archivo no contiene un SVG válido.");
  }

  documentNode.querySelectorAll("script, foreignObject, iframe, object, embed, audio, video, canvas").forEach((node) => node.remove());
  documentNode.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (
        name.startsWith("on") ||
        ((name === "href" || name === "xlink:href" || name === "src") && /^(?:https?:|\/\/|javascript:|data:text)/i.test(value)) ||
        (name === "style" && /(?:url\s*\(|@import|expression\s*\()/i.test(value))
      ) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  documentNode.querySelectorAll("style").forEach((node) => {
    if (/(?:url\s*\(|@import|expression\s*\()/i.test(node.textContent || "")) node.remove();
  });
  return new XMLSerializer().serializeToString(documentNode.documentElement);
}

function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function safeImportedPattern(value: unknown) {
  if (typeof value !== "string") return "";
  if (value === "none" || value.startsWith("/brand/")) return value;
  if (!value.startsWith("data:image/svg+xml")) return "";
  try {
    const payload = value.slice(value.indexOf(",") + 1);
    const decoded = value.includes(";base64,") ? atob(payload) : decodeURIComponent(payload);
    return svgToDataUrl(sanitizeSvg(decoded));
  } catch {
    return "";
  }
}

function safeText(value: unknown, fallback = "", maxLength = 1200) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

function safeAmount(value: unknown, maximum = 100_000_000) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? Math.min(maximum, Math.max(0, amount)) : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeBudgetItems(value: unknown, legacyEstimate = 0, legacyWarranty = 90): BudgetItem[] {
  const normalized = Array.isArray(value) ? value.slice(0, 80).flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    const category = BUDGET_ITEM_CATEGORIES.includes(candidate.category as BudgetItemCategory)
      ? candidate.category as BudgetItemCategory
      : "Servicio";
    return [{
      id: safeText(candidate.id, `item-${index + 1}`, 80) || `item-${index + 1}`,
      detail: safeText(candidate.detail, "Ítem sin descripción", 500) || "Ítem sin descripción",
      category,
      qty: Math.max(0.01, safeAmount(candidate.qty, 10_000) || 1),
      unitPrice: safeAmount(candidate.unitPrice ?? candidate.price),
      warranty: Math.round(safeAmount(candidate.warranty, 3650)),
    }];
  }) : [];

  if (!normalized.length && legacyEstimate > 0) {
    normalized.push({ id: "legacy-total", detail: "Servicio técnico presupuestado", category: "Servicio", qty: 1, unitPrice: legacyEstimate, warranty: legacyWarranty });
  }
  return normalized;
}

function normalizeOrder(value: unknown, index: number): RepairOrder | null {
  if (!isRecord(value)) return null;
  const status = STATUS_ORDER.includes(value.status as OrderStatus) ? value.status as OrderStatus : "Ingresado";
  const priority = ["Normal", "Alta", "Urgente"].includes(String(value.priority)) ? value.priority as RepairOrder["priority"] : "Normal";
  const receivedCandidate = safeText(value.receivedAt, "");
  const receivedAt = receivedCandidate && Number.isFinite(Date.parse(receivedCandidate)) ? receivedCandidate : new Date().toISOString();
  const dueCandidate = safeText(value.dueDate, "", 10);
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(dueCandidate) ? dueCandidate : "";
  const warranty = Math.round(safeAmount(value.warranty, 3650));
  const legacyEstimate = safeAmount(value.estimate);
  const items = normalizeBudgetItems(value.items, legacyEstimate, warranty);
  const surchargeMode: AdjustmentMode = value.surchargeMode === "percent" ? "percent" : "amount";
  const discountMode: AdjustmentMode = value.discountMode === "percent" ? "percent" : "amount";
  const depositMode: AdjustmentMode = value.depositMode === "percent" ? "percent" : "amount";
  const budgetStatus = BUDGET_STATUSES.includes(value.budgetStatus as BudgetStatus) ? value.budgetStatus as BudgetStatus : undefined;
  const draftFinancials = calculateFinancials({
    items,
    estimate: legacyEstimate,
    deposit: safeAmount(value.deposit),
    surchargeMode,
    surchargeValue: safeAmount(value.surchargeValue, surchargeMode === "percent" ? 100 : 100_000_000),
    discountMode,
    discountValue: safeAmount(value.discountValue, discountMode === "percent" ? 100 : 100_000_000),
    depositMode,
    depositValue: value.depositValue === undefined ? undefined : safeAmount(value.depositValue, depositMode === "percent" ? 100 : 100_000_000),
  });

  return {
    id: safeText(value.id, String(1000 + index), 32) || String(1000 + index),
    client: safeText(value.client, "Cliente sin nombre", 160) || "Cliente sin nombre",
    phone: safeText(value.phone, "", 80),
    email: safeText(value.email, "", 180),
    deviceType: safeText(value.deviceType, "Otro", 80) || "Otro",
    brand: safeText(value.brand, "", 100),
    model: safeText(value.model, "Equipo sin modelo", 140) || "Equipo sin modelo",
    serial: safeText(value.serial, "", 160),
    accessories: safeText(value.accessories, "", 500),
    condition: safeText(value.condition, "", 1000),
    issue: safeText(value.issue, "Sin falla informada", 2000) || "Sin falla informada",
    diagnosis: safeText(value.diagnosis, "", 3000),
    work: safeText(value.work, "", 3000),
    result: safeText(value.result, "", 2000),
    notes: safeText(value.notes, "", 3000),
    technician: safeText(value.technician, "Sin asignar", 160) || "Sin asignar",
    priority,
    status,
    receivedAt,
    dueDate,
    estimate: draftFinancials.total,
    deposit: draftFinancials.deposit,
    warranty,
    items,
    budgetStatus,
    surchargeMode,
    surchargeValue: safeAmount(value.surchargeValue, surchargeMode === "percent" ? 100 : 100_000_000),
    discountMode,
    discountValue: safeAmount(value.discountValue, discountMode === "percent" ? 100 : 100_000_000),
    depositMode,
    depositValue: value.depositValue === undefined ? safeAmount(value.deposit) : safeAmount(value.depositValue, depositMode === "percent" ? 100 : 100_000_000),
    paymentMethod: safeText(value.paymentMethod, "A convenir", 120) || "A convenir",
    validityDays: Math.max(1, Math.round(safeAmount(value.validityDays, 365) || 15)),
  };
}

function normalizeOrders(value: unknown): RepairOrder[] | null {
  if (!Array.isArray(value)) return null;
  const usedIds = new Set<string>();
  return value.slice(0, 5000).flatMap((candidate, index) => {
    const order = normalizeOrder(candidate, index);
    if (!order) return [];
    let id = order.id;
    while (usedIds.has(id)) id = `${order.id}-${index + 1}`;
    usedIds.add(id);
    return [{ ...order, id }];
  });
}

function normalizeSettings(value: unknown, fallback: AppSettings): AppSettings {
  if (!isRecord(value)) return fallback;
  const customPatternUrl = safeImportedPattern(value.customPatternUrl);
  const requestedPattern = value.patternUrl === "__custom__" ? customPatternUrl : safeImportedPattern(value.patternUrl);
  const importedOpacity = value.patternOpacity === undefined ? fallback.patternOpacity : safeAmount(value.patternOpacity, .4);
  const legacyOpacity = [.045, .1, .11].some((legacy) => Math.abs(importedOpacity - legacy) < .002);
  const patternOpacity = legacyOpacity ? .16 : Math.min(.4, importedOpacity);
  const patternScale = value.patternScale === undefined ? fallback.patternScale : Math.min(720, Math.max(120, safeAmount(value.patternScale, 720)));
  return {
    businessName: safeText(value.businessName, fallback.businessName, 100) || fallback.businessName,
    tagline: safeText(value.tagline, fallback.tagline, 240),
    ownerName: safeText(value.ownerName, fallback.ownerName, 120) || fallback.ownerName,
    phone: safeText(value.phone, fallback.phone, 80),
    address: safeText(value.address, fallback.address, 180),
    theme: value.theme === "dark" ? "dark" : "light",
    patternUrl: requestedPattern || fallback.patternUrl,
    patternName: safeText(value.patternName, fallback.patternName, 100),
    patternOpacity,
    patternScale,
    customPatternUrl,
    customPatternName: safeText(value.customPatternName, "", 100),
  };
}

function serializableSettings(settings: AppSettings) {
  return {
    ...settings,
    patternUrl: settings.customPatternUrl && settings.patternUrl === settings.customPatternUrl ? "__custom__" : settings.patternUrl,
  };
}

function localDateIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function useDialogFocus<T extends HTMLElement>() {
  const dialogRef = useRef<T>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      const firstControl = dialog?.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]");
      (firstControl || dialog)?.focus();
    });
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")].filter((element) => !element.hidden);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog?.addEventListener("keydown", trapFocus);
    return () => {
      cancelAnimationFrame(frame);
      dialog?.removeEventListener("keydown", trapFocus);
      previouslyFocused?.focus();
    };
  }, []);

  return dialogRef;
}

export function WorkshopApp() {
  const [view, setView] = useState<View>("dashboard");
  const [orders, setOrders] = useState<RepairOrder[]>(INITIAL_ORDERS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "Todos">("Todos");
  const [navOpen, setNavOpen] = useState(false);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<RepairOrder | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [patternError, setPatternError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [lastSavedAt, setLastSavedAt] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const svgInputRef = useRef<HTMLInputElement>(null);
  const saveRevisionRef = useRef(0);
  const pendingSaveMessageRef = useRef("");
  const online = useOnlineStatus();
  const { canInstall, isInstalled, install } = usePwaInstall();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const workspace = await loadWorkspace();
        if (workspace && !cancelled) {
          const normalized = normalizeOrders(workspace.orders);
          if (normalized) setOrders(normalized);
          setSettings((current) => normalizeSettings(workspace.settings, current));
          if (workspace.savedAt !== "1970-01-01T00:00:00.000Z") setLastSavedAt(workspace.savedAt);
        }
      } catch {
        // Keep a working local dataset if a previous backup was malformed.
      } finally {
        if (!cancelled) {
          setHydrated(true);
          setSaveState("saved");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const revision = ++saveRevisionRef.current;
    queueMicrotask(() => setSaveState("saving"));
    const timeout = window.setTimeout(() => {
      void saveWorkspace(orders, serializableSettings(settings)).then((result) => {
        if (saveRevisionRef.current !== revision) return;
        setLastSavedAt(result.savedAt);
        setSaveState("saved");
        if (pendingSaveMessageRef.current) {
          setToast(pendingSaveMessageRef.current);
          pendingSaveMessageRef.current = "";
        }
      }).catch(() => {
        if (saveRevisionRef.current === revision) setSaveState("error");
      });
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [hydrated, orders, settings]);

  useEffect(() => {
    if (!hydrated) return;
    const flushWorkspace = () => {
      // saveWorkspace mirrors to localStorage before its first asynchronous step,
      // so a last-second tab close still leaves a recoverable local copy.
      void saveWorkspace(orders, serializableSettings(settings));
    };
    window.addEventListener("pagehide", flushWorkspace);
    return () => window.removeEventListener("pagehide", flushWorkspace);
  }, [hydrated, orders, settings]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.style.colorScheme = settings.theme;
  }, [hydrated, settings.theme]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setOrderFormOpen(false);
        setSelectedId(null);
        setNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedId) || null, [orders, selectedId]);
  const dialogOpen = orderFormOpen || Boolean(selectedOrder);

  useEffect(() => {
    const background = document.querySelectorAll<HTMLElement>(".sidebar, .workspace, .mobile-nav");
    background.forEach((element) => dialogOpen ? element.setAttribute("inert", "") : element.removeAttribute("inert"));
    const previousOverflow = document.body.style.overflow;
    if (dialogOpen) document.body.style.overflow = "hidden";
    return () => {
      background.forEach((element) => element.removeAttribute("inert"));
      document.body.style.overflow = previousOverflow;
    };
  }, [dialogOpen]);

  const activeOrders = orders.filter((order) => order.status !== "Entregado");
  const diagnosedCount = orders.filter((order) => ["Ingresado", "Diagnosticando"].includes(order.status)).length;
  const repairCount = orders.filter((order) => order.status === "En reparación").length;
  const readyOrders = orders.filter((order) => order.status === "Listo para entregar");
  const partsCount = orders.filter((order) => order.status === "Esperando repuesto").length;
  const pendingBalance = activeOrders.reduce((sum, order) => sum + calculateFinancials(order).balance, 0);
  const today = localDateIso();
  const dueToday = activeOrders.filter((order) => (Boolean(order.dueDate) && order.dueDate <= today) || order.status === "Listo para entregar").slice(0, 3);

  const filteredOrders = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("es");
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "Todos" || order.status === statusFilter;
      const itemText = order.items?.map((item) => item.detail).join(" ") || "";
      const haystack = `${order.id} ${order.client} ${order.phone} ${order.brand} ${order.model} ${order.serial} ${order.issue} ${order.diagnosis} ${order.work} ${itemText}`.toLocaleLowerCase("es");
      return matchesStatus && (!needle || haystack.includes(needle));
    });
  }, [orders, search, statusFilter]);

  const clients = useMemo(() => {
    const byClient = new Map<string, { name: string; phone: string; email: string; orders: RepairOrder[]; total: number }>();
    orders.forEach((order) => {
      const key = `${order.client.toLowerCase()}|${order.phone}`;
      const current = byClient.get(key) || { name: order.client, phone: order.phone, email: order.email, orders: [], total: 0 };
      current.orders.push(order);
      current.total += calculateFinancials(order).total;
      if (!current.email && order.email) current.email = order.email;
      byClient.set(key, current);
    });
    return [...byClient.values()].sort((a, b) => b.orders.length - a.orders.length || a.name.localeCompare(b.name));
  }, [orders]);

  const patternStyle = {
    "--app-pattern": settings.patternUrl === "none" ? "none" : `url("${settings.patternUrl}")`,
    "--app-pattern-opacity": String(settings.patternOpacity),
    "--app-pattern-size": `${settings.patternScale}px`,
  } as CSSProperties;

  const showToast = (message: string) => setToast(message);

  const changeView = (next: View) => {
    setView(next);
    setNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openNewOrder = () => {
    setEditingOrder(null);
    setOrderFormOpen(true);
  };

  const openEditOrder = (order: RepairOrder) => {
    setEditingOrder(order);
    setSelectedId(null);
    setOrderFormOpen(true);
  };

  const saveOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextId = editingOrder?.id || String(Math.max(1000, ...orders.map((order) => Number(order.id) || 0)) + 1);
    let items: BudgetItem[] = [];
    try {
      items = normalizeBudgetItems(JSON.parse(String(form.get("itemsJson") || "[]")));
    } catch {
      items = [];
    }
    const surchargeMode = String(form.get("surchargeMode") || "amount") as AdjustmentMode;
    const discountMode = String(form.get("discountMode") || "amount") as AdjustmentMode;
    const depositMode = String(form.get("depositMode") || "amount") as AdjustmentMode;
    const surchargeValue = safeAmount(form.get("surchargeValue"), surchargeMode === "percent" ? 100 : 100_000_000);
    const discountValue = safeAmount(form.get("discountValue"), discountMode === "percent" ? 100 : 100_000_000);
    const depositValue = safeAmount(form.get("depositValue"), depositMode === "percent" ? 100 : 100_000_000);
    const financials = calculateFinancials({
      items,
      estimate: 0,
      deposit: 0,
      surchargeMode,
      surchargeValue,
      discountMode,
      discountValue,
      depositMode,
      depositValue,
    });
    const nextOrder: RepairOrder = {
      id: nextId,
      client: String(form.get("client") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      email: String(form.get("email") || "").trim(),
      deviceType: String(form.get("deviceType") || "Smartphone"),
      brand: String(form.get("brand") || "").trim(),
      model: String(form.get("model") || "").trim(),
      serial: String(form.get("serial") || "").trim(),
      accessories: String(form.get("accessories") || "").trim(),
      condition: String(form.get("condition") || "").trim(),
      issue: String(form.get("issue") || "").trim(),
      diagnosis: String(form.get("diagnosis") || "").trim(),
      work: String(form.get("work") || "").trim(),
      result: String(form.get("result") || "").trim(),
      notes: String(form.get("notes") || "").trim(),
      technician: String(form.get("technician") || settings.ownerName),
      priority: String(form.get("priority") || "Normal") as RepairOrder["priority"],
      status: String(form.get("status") || "Ingresado") as OrderStatus,
      receivedAt: editingOrder?.receivedAt || new Date().toISOString(),
      dueDate: String(form.get("dueDate") || ""),
      estimate: financials.total,
      deposit: financials.deposit,
      warranty: Number(form.get("warranty")) || 0,
      items,
      budgetStatus: String(form.get("budgetStatus") || "Borrador") as BudgetStatus,
      surchargeMode,
      surchargeValue,
      discountMode,
      discountValue,
      depositMode,
      depositValue,
      paymentMethod: String(form.get("paymentMethod") || "A convenir"),
      validityDays: Math.max(1, Number(form.get("validityDays")) || 15),
    };

    pendingSaveMessageRef.current = editingOrder
      ? `Orden #${nextId} actualizada y guardada`
      : `Orden #${nextId} guardada en este dispositivo`;
    setOrders((current) => editingOrder
      ? current.map((order) => order.id === editingOrder.id ? nextOrder : order)
      : [nextOrder, ...current]);
    setOrderFormOpen(false);
    setEditingOrder(null);
    setSelectedId(nextId);
  };

  const updateOrderStatus = (id: string, status: OrderStatus) => {
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
    showToast(`Estado actualizado: ${status}`);
  };

  const deleteOrder = (order: RepairOrder) => {
    if (!window.confirm(`¿Eliminar definitivamente la orden #${order.id} de ${order.client}?`)) return;
    setOrders((current) => current.filter((item) => item.id !== order.id));
    setSelectedId(null);
    showToast(`Orden #${order.id} eliminada`);
  };

  const duplicateOrder = (order: RepairOrder) => {
    const nextId = String(Math.max(1000, ...orders.map((item) => Number(item.id) || 0)) + 1);
    const copy: RepairOrder = {
      ...order,
      id: nextId,
      receivedAt: new Date().toISOString(),
      dueDate: "",
      status: "Ingresado",
      budgetStatus: "Borrador",
      deposit: 0,
      depositValue: 0,
      items: getOrderItems(order).map((item) => ({ ...item, id: createItemId() })),
    };
    setOrders((current) => [copy, ...current]);
    setSelectedId(nextId);
    showToast(`Orden #${nextId} duplicada como borrador`);
  };

  const contactByWhatsApp = (order: RepairOrder) => {
    const number = order.phone.replace(/\D/g, "");
    const text = encodeURIComponent(`Hola ${order.client.split(" ")[0]}, te escribimos de ${settings.businessName} por tu ${deviceLabel(order)} (orden #${order.id}).`);
    window.open(`https://wa.me/${number}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const shareOrder = async (order: RepairOrder) => {
    const summary = `Orden #${order.id} · ${deviceLabel(order)} · ${order.status} · Presupuesto ${formatMoney(calculateFinancials(order).total)} · Saldo ${formatMoney(calculateFinancials(order).balance)}`;
    try {
      if (navigator.share) await navigator.share({ title: `${settings.businessName} · Orden #${order.id}`, text: summary });
      else {
        await navigator.clipboard.writeText(summary);
        showToast("Resumen copiado al portapapeles");
      }
    } catch {
      // The user may cancel the native share sheet.
    }
  };

  const exportBackup = () => {
    const payload = JSON.stringify({ product: "TallerOS", version: 2, exportedAt: new Date().toISOString(), settings: serializableSettings(settings), orders }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `talleros-backup-${today}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Copia de seguridad descargada");
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("El backup supera el límite de 5 MB");
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      const normalizedOrders = normalizeOrders(parsed.orders);
      if (!normalizedOrders) throw new Error("Backup inválido");
      setOrders(normalizedOrders);
      if (parsed.settings) {
        setSettings((current) => normalizeSettings(parsed.settings, current));
      }
      showToast(`${normalizedOrders.length} órdenes restauradas`);
    } catch {
      showToast("No pudimos importar ese archivo");
    }
  };

  const uploadPattern = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setPatternError("");
    if (!file) return;
    if (file.size > 256 * 1024) {
      setPatternError("El SVG supera el límite seguro de 256 KB.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".svg") && file.type !== "image/svg+xml") {
      setPatternError("Elegí un archivo con formato SVG.");
      return;
    }
    try {
      const cleanSvg = sanitizeSvg(await file.text());
      const dataUrl = svgToDataUrl(cleanSvg);
      setSettings((current) => ({
        ...current,
        patternUrl: dataUrl,
        patternName: file.name.replace(/\.svg$/i, ""),
        customPatternUrl: dataUrl,
        customPatternName: file.name.replace(/\.svg$/i, ""),
      }));
      showToast("Patrón SVG aplicado y guardado");
    } catch (error) {
      setPatternError(error instanceof Error ? error.message : "No pudimos leer el SVG.");
    }
  };

  const choosePattern = (url: string, name: string) => {
    setSettings((current) => ({ ...current, patternUrl: url, patternName: name }));
    showToast(`Fondo “${name}” aplicado`);
  };

  const appName = settings.businessName.trim() || "TallerOS";
  const firstName = settings.ownerName.trim().split(" ")[0] || "Técnico";
  const dateHeading = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const storageError = saveState === "error";

  return (
    <div className={`app-root theme-${settings.theme}`} style={patternStyle}>
      <PwaRegistration />
      <div className="canvas-pattern" aria-hidden="true" />
      {!online && <div className="offline-banner"><WifiOff size={14} /> Estás trabajando sin conexión. Tus cambios se guardan en este dispositivo.</div>}
      {storageError && <div className="storage-warning" role="alert"><HardDriveUpload size={16}/><span><strong>No pudimos guardar los últimos cambios.</strong> Liberá espacio del navegador y exportá un backup.</span></div>}

      <aside className={`sidebar ${navOpen ? "open" : ""}`}>
        <button className="sidebar-close" onClick={() => setNavOpen(false)} aria-label="Cerrar menú"><X /></button>
        <button className="brand-lockup" onClick={() => changeView("dashboard")}>
          <span className="brand-mark"><Wrench size={19} strokeWidth={2.6} /></span>
          <span className="brand-word"><strong>{appName.replace(/os$/i, "")}<em>{/os$/i.test(appName) ? "OS" : ""}</em></strong><small>GESTIÓN TÉCNICA</small></span>
        </button>

        <nav className="main-nav" aria-label="Navegación principal">
          <NavButton active={view === "dashboard"} icon={<LayoutDashboard />} label="Panel" onClick={() => changeView("dashboard")} />
          <NavButton active={view === "orders"} icon={<ClipboardList />} label="Órdenes" count={activeOrders.length} onClick={() => changeView("orders")} />
          <NavButton active={view === "budgets"} icon={<FileText />} label="Presupuestos" count={orders.filter((order) => calculateFinancials(order).total > 0).length} onClick={() => changeView("budgets")} />
          <NavButton active={view === "clients"} icon={<Users />} label="Clientes" onClick={() => changeView("clients")} />
        </nav>

        <div className="sidebar-bottom">
          <div className={`sync-note save-${saveState}`}>{saveState === "error" ? <HardDriveUpload size={16} /> : saveState === "saved" ? <Check size={16}/> : <Save size={16}/>}<div><strong>{saveState === "loading" ? "Abriendo datos" : saveState === "saving" ? "Guardando cambios" : saveState === "error" ? "Guardado pendiente" : "Datos guardados"}</strong><small>{saveState === "saved" && lastSavedAt ? `Verificado ${new Date(lastSavedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}` : online ? "Disponible en este dispositivo" : "Sin conexión · no perdés datos"}</small></div></div>
          <NavButton active={view === "settings"} icon={<Settings />} label="Ajustes" onClick={() => changeView("settings")} />
          <div className="technician-card"><div className="avatar">{getInitials(settings.ownerName)}</div><div><strong>{settings.ownerName}</strong><small>Técnico principal</small></div><ChevronRight size={16} /></div>
        </div>
      </aside>
      {navOpen && <button className="nav-scrim" aria-label="Cerrar menú" onClick={() => setNavOpen(false)} />}

      <section className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setNavOpen(true)} aria-label="Abrir menú"><Menu /></button>
          <label className="global-search">
            <Search size={18} />
            <input ref={searchRef} aria-label="Buscar" value={search} onChange={(event) => { setSearch(event.target.value); if (event.target.value && view !== "budgets") setView("orders"); }} placeholder="Buscar orden, cliente, IMEI..." />
            {search ? <button onClick={() => setSearch("")} aria-label="Borrar búsqueda"><X size={14} /></button> : <kbd>Ctrl K</kbd>}
          </label>
          <div className="top-actions">
            <span className={`save-indicator ${saveState}`} role="status">{saveState === "loading" ? "Abriendo" : saveState === "saving" ? "Guardando…" : saveState === "error" ? "No guardado" : "Guardado"}</span>
            <span className={`online-dot ${online ? "" : "offline"}`}>{online ? "En línea" : "Offline"}</span>
            <button className="icon-button" onClick={() => showToast("No tenés notificaciones nuevas")} aria-label="Notificaciones"><Bell size={19} /></button>
            <button className="primary-button" onClick={openNewOrder}><Plus size={18} />Nueva orden</button>
          </div>
        </header>

        {view === "dashboard" && (
          <Dashboard
            firstName={firstName}
            dateHeading={dateHeading}
            activeOrders={activeOrders}
            diagnosedCount={diagnosedCount}
            repairCount={repairCount}
            readyOrders={readyOrders}
            partsCount={partsCount}
            dueToday={dueToday}
            today={today}
            pendingBalance={pendingBalance}
            onNew={openNewOrder}
            onOrders={() => changeView("orders")}
            onOpenOrder={setSelectedId}
          />
        )}

        {view === "orders" && (
          <OrdersView
            orders={filteredOrders}
            allOrders={orders}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            search={search}
            setSearch={setSearch}
            onNew={openNewOrder}
            onOpen={setSelectedId}
          />
        )}

        {view === "budgets" && (
          <BudgetsView
            orders={filteredOrders}
            allOrders={orders}
            search={search}
            setSearch={setSearch}
            onNew={openNewOrder}
            onOpen={setSelectedId}
          />
        )}

        {view === "clients" && (
          <ClientsView clients={clients} onNew={openNewOrder} onOpen={(id) => setSelectedId(id)} />
        )}

        {view === "settings" && (
          <SettingsView
            settings={settings}
            setSettings={setSettings}
            patternError={patternError}
            svgInputRef={svgInputRef}
            importRef={importRef}
            choosePattern={choosePattern}
            uploadPattern={uploadPattern}
            exportBackup={exportBackup}
            importBackup={importBackup}
            canInstall={canInstall}
            isInstalled={isInstalled}
            install={install}
            showToast={showToast}
            storageError={storageError}
          />
        )}
      </section>

      <nav className="mobile-nav" aria-label="Navegación móvil">
        <NavButton active={view === "dashboard"} icon={<LayoutDashboard />} label="Panel" onClick={() => changeView("dashboard")} />
        <NavButton active={view === "orders"} icon={<ClipboardList />} label="Órdenes" onClick={() => changeView("orders")} />
        <button className="mobile-new" onClick={openNewOrder} aria-label="Nueva orden"><Plus /></button>
        <NavButton active={view === "budgets"} icon={<FileText />} label="Presup." onClick={() => changeView("budgets")} />
        <NavButton active={view === "clients"} icon={<Users />} label="Clientes" onClick={() => changeView("clients")} />
      </nav>

      {orderFormOpen && <OrderForm order={editingOrder} ownerName={settings.ownerName} onClose={() => setOrderFormOpen(false)} onSubmit={saveOrder} />}
      {selectedOrder && (
        <OrderDrawer
          order={selectedOrder}
          settings={settings}
          onClose={() => setSelectedId(null)}
          onEdit={() => openEditOrder(selectedOrder)}
          onStatus={(status) => updateOrderStatus(selectedOrder.id, status)}
          onWhatsApp={() => contactByWhatsApp(selectedOrder)}
          onShare={() => shareOrder(selectedOrder)}
          onDuplicate={() => duplicateOrder(selectedOrder)}
          onDelete={() => deleteOrder(selectedOrder)}
          onNotify={showToast}
        />
      )}
      {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}
    </div>
  );
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button className={active ? "active" : ""} onClick={onClick}>{icon}<span>{label}</span>{typeof count === "number" && <b>{count}</b>}</button>;
}

function Dashboard({ firstName, dateHeading, activeOrders, diagnosedCount, repairCount, readyOrders, partsCount, dueToday, today, pendingBalance, onNew, onOrders, onOpenOrder }: {
  firstName: string;
  dateHeading: string;
  activeOrders: RepairOrder[];
  diagnosedCount: number;
  repairCount: number;
  readyOrders: RepairOrder[];
  partsCount: number;
  dueToday: RepairOrder[];
  today: string;
  pendingBalance: number;
  onNew: () => void;
  onOrders: () => void;
  onOpenOrder: (id: string) => void;
}) {
  const utilization = Math.min(100, Math.round((activeOrders.length / 12) * 100));
  return (
    <div className="content dashboard-content">
      <section className="welcome-row">
        <div><p className="eyebrow">{dateHeading.toUpperCase()}</p><h1>Buen día, {firstName}.</h1><p>Tenés <strong>{activeOrders.length} equipos</strong> que necesitan atención.</p></div>
        <button className="primary-button large" onClick={onNew}><Plus size={19} />Recibir equipo</button>
      </section>

      <section className="dashboard-grid">
        <article className="hero-card">
          <div className="hero-copy"><span className="hero-kicker">RESUMEN DEL TALLER</span><h2>Todo bajo control.<br/><em>{readyOrders.length === 1 ? "Una entrega lista." : `${readyOrders.length} entregas listas.`}</em></h2><p>Priorizá lo importante, registrá cada avance y mantené a tus clientes informados desde un solo lugar.</p><button onClick={onOrders}>Ver todas las órdenes <ChevronRight size={17} /></button></div>
          <div className="hero-meter"><div><strong>{utilization}%</strong><span>Carga del taller</span></div><svg viewBox="0 0 120 70" aria-hidden="true"><path d="M10 60a50 50 0 0 1 100 0"/><path className="value" style={{ strokeDashoffset: 157 - 1.57 * utilization }} d="M10 60a50 50 0 0 1 100 0"/></svg><small>{activeOrders.length} de 12 espacios ocupados</small></div>
        </article>

        <div className="stat-strip">
          <Stat icon={<Smartphone />} tone="amber" label="Por diagnosticar" value={diagnosedCount} note="Revisá ingresos nuevos" />
          <Stat icon={<Wrench />} tone="blue" label="En reparación" value={repairCount} note="Trabajo activo" />
          <Stat icon={<ClipboardCheck />} tone="green" label="Listos para entregar" value={readyOrders.length} note={`${formatMoney(readyOrders.reduce((sum, order) => sum + calculateFinancials(order).balance, 0))} por cobrar`} />
          <Stat icon={<PackageOpen />} tone="violet" label="Repuestos pendientes" value={partsCount} note="Seguimiento de compras" />
        </div>

        <article className="orders-panel">
          <header><div><span className="section-kicker">ACTIVIDAD RECIENTE</span><h2>Órdenes en curso</h2></div><button onClick={onOrders}>Ver todas <ChevronRight size={16} /></button></header>
          <div className="orders-list">
            {activeOrders.slice(0, 5).map((order) => <OrderRow key={order.id} order={order} onOpen={() => onOpenOrder(order.id)} />)}
          </div>
        </article>

        <aside className="day-panel">
          <header><div><span className="section-kicker">PRÓXIMAS</span><h2>Prioridad de hoy</h2></div><span>{dueToday.length}</span></header>
          {dueToday.length ? dueToday.map((order) => (
            <button className="timeline-item" key={order.id} onClick={() => onOpenOrder(order.id)}>
              <time>{order.dueDate === today ? "Hoy" : formatDate(order.dueDate)}</time>
              <div><i className={STATUS_META[order.status].tone}/><strong>{deviceLabel(order)}</strong><span>{order.client} · #{order.id}</span><small>Saldo: {formatMoney(calculateFinancials(order).balance)}</small></div>
            </button>
          )) : <div className="mini-empty"><Check size={22}/><strong>Día despejado</strong><span>No hay entregas vencidas.</span></div>}
          <button className="day-action" onClick={onOrders}>Abrir agenda completa <ChevronRight size={16}/></button>
        </aside>
      </section>

      <section className="dashboard-footnote"><ShieldCheck size={17}/><span>Los datos se guardan en este dispositivo y siguen disponibles sin conexión.</span><strong>{formatMoney(pendingBalance)} pendiente</strong></section>
    </div>
  );
}

function Stat({ icon, tone, label, value, note }: { icon: React.ReactNode; tone: string; label: string; value: number; note: string }) {
  return <article><span className={`stat-icon ${tone}`}>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>;
}

function OrderRow({ order, onOpen }: { order: RepairOrder; onOpen: () => void }) {
  return (
    <button className="order-row" onClick={onOpen}>
      <div className="device-icon"><DeviceIcon type={order.deviceType} /></div>
      <div className="order-main"><strong>{deviceLabel(order)}</strong><span>{order.client} · {order.issue}</span></div>
      <span className={`status ${STATUS_META[order.status].tone}`}>{STATUS_META[order.status].short}</span>
      <span className="order-time"><b>#{order.id}</b>{formatDate(order.receivedAt)}</span>
      <ChevronRight className="row-chevron" size={18}/>
    </button>
  );
}

function OrdersView({ orders, allOrders, statusFilter, setStatusFilter, search, setSearch, onNew, onOpen }: {
  orders: RepairOrder[];
  allOrders: RepairOrder[];
  statusFilter: OrderStatus | "Todos";
  setStatusFilter: (status: OrderStatus | "Todos") => void;
  search: string;
  setSearch: (value: string) => void;
  onNew: () => void;
  onOpen: (id: string) => void;
}) {
  const pending = allOrders.reduce((sum, order) => sum + (order.status === "Entregado" ? 0 : calculateFinancials(order).balance), 0);
  return (
    <div className="content page-content">
      <section className="page-heading"><div><p className="eyebrow">CONTROL DE TRABAJOS</p><h1>Órdenes de reparación</h1><p>Diagnóstico, presupuesto, avance y entrega en un mismo historial.</p></div><button className="primary-button large" onClick={onNew}><Plus size={18}/>Nueva orden</button></section>
      <div className="summary-line">
        <div><span>Órdenes activas</span><strong>{allOrders.filter((order) => order.status !== "Entregado").length}</strong></div>
        <div><span>Pendiente de cobro</span><strong>{formatMoney(pending)}</strong></div>
        <div><span>Listas para entregar</span><strong>{allOrders.filter((order) => order.status === "Listo para entregar").length}</strong></div>
      </div>
      <section className="orders-workspace">
        <div className="orders-toolbar">
          <label className="page-search"><Search size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente, equipo, orden, IMEI..." />{search && <button onClick={() => setSearch("")}><X size={15}/></button>}</label>
          <div className="filter-scroll">
            {(["Todos", ...STATUS_ORDER] as const).map((status) => <button key={status} className={statusFilter === status ? "active" : ""} onClick={() => setStatusFilter(status)}>{status === "Todos" ? "Todas" : STATUS_META[status].short}</button>)}
          </div>
        </div>
        <div className="orders-table-head"><span>Equipo y cliente</span><span>Estado</span><span>Ingreso</span><span>Saldo</span><span /></div>
        <div className="full-orders-list">
          {orders.map((order) => (
            <button className="full-order-row" key={order.id} onClick={() => onOpen(order.id)}>
              <div className="device-icon"><DeviceIcon type={order.deviceType}/></div>
              <div className="full-order-main"><strong>{deviceLabel(order)}</strong><span>#{order.id} · {order.client}</span><small>{order.issue}</small></div>
              <span className={`status ${STATUS_META[order.status].tone}`}>{order.status}</span>
              <time>{formatDate(order.receivedAt)}</time>
              <strong className="row-balance">{formatMoney(calculateFinancials(order).balance)}</strong>
              <ChevronRight size={18}/>
            </button>
          ))}
          {!orders.length && <div className="empty-state"><Search size={28}/><h3>No encontramos órdenes</h3><p>Probá con otro término o quitá los filtros activos.</p><button onClick={() => { setSearch(""); setStatusFilter("Todos"); }}>Limpiar filtros</button></div>}
        </div>
      </section>
    </div>
  );
}

function BudgetsView({ orders, allOrders, search, setSearch, onNew, onOpen }: {
  orders: RepairOrder[];
  allOrders: RepairOrder[];
  search: string;
  setSearch: (value: string) => void;
  onNew: () => void;
  onOpen: (id: string) => void;
}) {
  const quotedTotal = allOrders.reduce((sum, order) => sum + calculateFinancials(order).total, 0);
  const approvedTotal = allOrders.reduce((sum, order) => budgetStatusFor(order) === "Aprobado" ? sum + calculateFinancials(order).total : sum, 0);
  const awaiting = allOrders.filter((order) => budgetStatusFor(order) === "Enviado").length;

  return (
    <div className="content page-content budgets-page">
      <section className="page-heading">
        <div><p className="eyebrow">COTIZACIÓN Y COBRO</p><h1>Presupuestos</h1><p>Armá ítems, aplicá ajustes, registrá anticipos e imprimí un documento profesional.</p></div>
        <button className="primary-button large" onClick={onNew}><Plus size={18}/>Nuevo presupuesto</button>
      </section>
      <div className="summary-line budget-summary">
        <div><span>Total presupuestado</span><strong>{formatMoney(quotedTotal)}</strong></div>
        <div><span>Aprobado</span><strong>{formatMoney(approvedTotal)}</strong></div>
        <div><span>Esperando respuesta</span><strong>{awaiting}</strong></div>
      </div>
      <section className="orders-workspace budget-workspace">
        <div className="orders-toolbar">
          <label className="page-search"><Search size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente, equipo, ítem o número..." />{search && <button onClick={() => setSearch("")} aria-label="Borrar búsqueda"><X size={15}/></button>}</label>
          <p className="budget-toolbar-note"><FileText size={16}/> Abrí un presupuesto para editarlo, compartirlo o imprimirlo.</p>
        </div>
        <div className="budget-list">
          {orders.map((order) => {
            const financials = calculateFinancials(order);
            const budgetStatus = budgetStatusFor(order);
            return (
              <button className="budget-row" key={order.id} onClick={() => onOpen(order.id)}>
                <span className="budget-doc-icon"><FileText/></span>
                <span className="budget-identity"><small>PRESUPUESTO #{order.id}</small><strong>{order.client}</strong><span>{deviceLabel(order)} · {order.items?.length || (order.estimate ? 1 : 0)} ítems</span></span>
                <span className={`budget-status tone-${budgetStatus.toLowerCase()}`}>{budgetStatus}</span>
                <span className="budget-amount"><small>Total</small><strong>{formatMoney(financials.total)}</strong><span>{financials.balance > 0 ? `Saldo ${formatMoney(financials.balance)}` : "Sin saldo pendiente"}</span></span>
                <ChevronRight size={18}/>
              </button>
            );
          })}
          {!orders.length && <div className="empty-state"><FileText size={30}/><h3>No encontramos presupuestos</h3><p>Creá uno nuevo o cambiá el término de búsqueda.</p><button onClick={() => setSearch("")}>Limpiar búsqueda</button></div>}
        </div>
      </section>
    </div>
  );
}

function ClientsView({ clients, onNew, onOpen }: {
  clients: { name: string; phone: string; email: string; orders: RepairOrder[]; total: number }[];
  onNew: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="content page-content">
      <section className="page-heading"><div><p className="eyebrow">RELACIONES DEL TALLER</p><h1>Clientes y equipos</h1><p>Un historial claro para resolver más rápido cada próxima visita.</p></div><button className="primary-button large" onClick={onNew}><Plus size={18}/>Recibir equipo</button></section>
      <div className="client-insight"><div><Users/><span><strong>{clients.length}</strong> clientes registrados</span></div><div><Smartphone/><span><strong>{clients.reduce((sum, client) => sum + client.orders.length, 0)}</strong> equipos recibidos</span></div><div><RotateCcw/><span><strong>{clients.filter((client) => client.orders.length > 1).length}</strong> clientes recurrentes</span></div></div>
      <section className="client-grid">
        {clients.map((client, index) => {
          const lastOrder = client.orders[0];
          return (
            <article className="client-card" key={`${client.name}-${client.phone}`}>
              <header><span className={`client-avatar tone-${index % 5}`}>{getInitials(client.name)}</span><button aria-label="Más opciones"><MoreHorizontal/></button></header>
              <h2>{client.name}</h2><a href={`tel:${client.phone}`}>{client.phone}</a><span>{client.email || "Sin email registrado"}</span>
              <div className="client-metrics"><div><small>Órdenes</small><strong>{client.orders.length}</strong></div><div><small>Facturado</small><strong>{formatMoney(client.total)}</strong></div></div>
              <button className="last-device" onClick={() => onOpen(lastOrder.id)}><DeviceIcon type={lastOrder.deviceType} size={17}/><span><small>Último equipo</small><strong>{deviceLabel(lastOrder)}</strong></span><ChevronRight size={16}/></button>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function SettingsView({ settings, setSettings, patternError, svgInputRef, importRef, choosePattern, uploadPattern, exportBackup, importBackup, canInstall, isInstalled, install, showToast, storageError }: {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  patternError: string;
  svgInputRef: React.RefObject<HTMLInputElement | null>;
  importRef: React.RefObject<HTMLInputElement | null>;
  choosePattern: (url: string, name: string) => void;
  uploadPattern: (event: ChangeEvent<HTMLInputElement>) => void;
  exportBackup: () => void;
  importBackup: (event: ChangeEvent<HTMLInputElement>) => void;
  canInstall: boolean;
  isInstalled: boolean;
  install: () => Promise<PwaInstallOutcome>;
  showToast: (message: string) => void;
  storageError: boolean;
}) {
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
  const installApp = async () => {
    if (isInstalled) return showToast("TallerOS ya está instalada");
    const outcome = await install();
    showToast(outcome === "accepted" ? "Instalación iniciada" : "Podés instalarla desde el menú del navegador");
  };

  return (
    <div className="content page-content settings-page">
      <section className="page-heading"><div><p className="eyebrow">PERSONALIZACIÓN Y DATOS</p><h1>Ajustes del taller</h1><p>Adaptá la app a tu marca y guardá una copia de tu información.</p></div><span className={`saved-badge ${storageError ? "error" : ""}`}>{storageError ? <HardDriveUpload size={14}/> : <Check size={14}/>} {storageError ? "Guardado pendiente" : "Cambios guardados"}</span></section>
      <div className="settings-layout">
        <section className="settings-main">
          <article className="settings-card">
            <header><span className="settings-icon"><UserRound/></span><div><h2>Identidad del taller</h2><p>Estos datos aparecen en la app y en las fichas de trabajo.</p></div></header>
            <div className="field-grid two">
              <label className="field"><span>Nombre comercial</span><input value={settings.businessName} onChange={(event) => update("businessName", event.target.value)} /></label>
              <label className="field"><span>Responsable</span><input value={settings.ownerName} onChange={(event) => update("ownerName", event.target.value)} /></label>
              <label className="field wide"><span>Descripción</span><input value={settings.tagline} onChange={(event) => update("tagline", event.target.value)} /></label>
              <label className="field"><span>Teléfono</span><input value={settings.phone} onChange={(event) => update("phone", event.target.value)} /></label>
              <label className="field"><span>Ciudad / dirección</span><input value={settings.address} onChange={(event) => update("address", event.target.value)} /></label>
            </div>
          </article>

          <article className="settings-card pattern-settings">
            <header><span className="settings-icon lime"><Palette/></span><div><h2>Fondo y patrones</h2><p>Elegí uno incluido o cargá tu propio patrón SVG.</p></div></header>
            <div className="pattern-gallery">
              {BUILT_IN_PATTERNS.map((pattern) => <button key={pattern.name} className={`${pattern.className} ${settings.patternUrl === pattern.url ? "active" : ""}`} onClick={() => choosePattern(pattern.url, pattern.name)}><span /> <strong>{pattern.name}</strong>{settings.patternUrl === pattern.url && <Check/>}</button>)}
              {settings.customPatternUrl && <button className={`custom ${settings.patternUrl === settings.customPatternUrl ? "active" : ""}`} style={{ backgroundImage: `url("${settings.customPatternUrl}")` }} onClick={() => choosePattern(settings.customPatternUrl, settings.customPatternName || "Personalizado")}><span/><strong>{settings.customPatternName || "Personalizado"}</strong>{settings.patternUrl === settings.customPatternUrl && <Check/>}</button>}
            </div>
            <div className="upload-zone" onDragOver={(event) => event.preventDefault()} onDrop={async (event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (!file) return; const transfer = new DataTransfer(); transfer.items.add(file); if (svgInputRef.current) { svgInputRef.current.files = transfer.files; svgInputRef.current.dispatchEvent(new Event("change", { bubbles: true })); } }}>
              <span><Upload/></span><div><strong>Cargar un SVG personalizado</strong><p>Arrastralo aquí o elegilo desde tu equipo. Máximo 256 KB.</p></div><button onClick={() => svgInputRef.current?.click()}>Elegir archivo</button>
              <input ref={svgInputRef} type="file" accept="image/svg+xml,.svg" onChange={uploadPattern} hidden />
            </div>
            {patternError && <p className="field-error">{patternError}</p>}
            <div className="pattern-controls">
              <label><span>Intensidad <b>{Math.round(settings.patternOpacity * 100)}%</b></span><input type="range" min="0.03" max="0.4" step="0.01" value={settings.patternOpacity} onChange={(event) => update("patternOpacity", Number(event.target.value))}/></label>
              <label><span>Escala <b>{settings.patternScale}px</b></span><input type="range" min="120" max="720" step="20" value={settings.patternScale} onChange={(event) => update("patternScale", Number(event.target.value))}/></label>
            </div>
            <div className="security-note"><ShieldCheck/><p><strong>SVG protegido.</strong> Quitamos scripts, eventos y referencias externas antes de mostrar y guardar el archivo.</p></div>
          </article>

          <article className="settings-card appearance-card">
            <header><span className="settings-icon"><Moon/></span><div><h2>Apariencia</h2><p>Usá la interfaz que mejor se adapte a tu espacio de trabajo.</p></div></header>
            <div className="theme-toggle"><button className={settings.theme === "light" ? "active" : ""} onClick={() => update("theme", "light")}><Sun/>Claro</button><button className={settings.theme === "dark" ? "active" : ""} onClick={() => update("theme", "dark")}><Moon/>Oscuro</button></div>
          </article>
        </section>

        <aside className="settings-rail">
          <article className="install-card"><span className="install-logo"><Zap/></span><h2>{isInstalled ? "App instalada" : "Llevá TallerOS con vos"}</h2><p>Instalala en el celular o la computadora y seguí trabajando incluso sin internet.</p><button onClick={installApp} disabled={!canInstall && isInstalled}><Download/>{isInstalled ? "Ya está instalada" : canInstall ? "Instalar aplicación" : "Cómo instalarla"}</button><small><ShieldCheck/> Datos locales y acceso offline</small></article>
          <article className="settings-card compact-card"><header><span className="settings-icon"><HardDriveUpload/></span><div><h2>Copia de seguridad</h2><p>Exportá todo antes de cambiar de equipo.</p></div></header><button className="secondary-action" onClick={exportBackup}><FileDown/>Exportar backup</button><button className="secondary-action" onClick={() => importRef.current?.click()}><CloudDownload/>Importar backup</button><input ref={importRef} type="file" accept="application/json,.json" onChange={importBackup} hidden/></article>
          <article className="help-card"><HelpCircle/><div><strong>¿Necesitás ayuda?</strong><p>Las órdenes se guardan automáticamente. Exportá un backup periódicamente para tener una copia externa.</p></div></article>
        </aside>
      </div>
    </div>
  );
}

function OrderForm({ order, ownerName, onClose, onSubmit }: { order: RepairOrder | null; ownerName: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const initialDue = order?.dueDate || "";
  const dialogRef = useDialogFocus<HTMLFormElement>();
  const [validationMessage, setValidationMessage] = useState("");
  const [templateCategory, setTemplateCategory] = useState<"Todas" | ServiceCategory>("Todas");
  const [appliedTemplate, setAppliedTemplate] = useState("");
  const [issue, setIssue] = useState(order?.issue || "");
  const [diagnosis, setDiagnosis] = useState(order?.diagnosis || "");
  const [work, setWork] = useState(order?.work || "");
  const [result, setResult] = useState(order?.result || "");
  const [items, setItems] = useState<BudgetItem[]>(() => getOrderItems(order));
  const [warranty, setWarranty] = useState(order?.warranty ?? 90);
  const [surchargeMode, setSurchargeMode] = useState<AdjustmentMode>(order?.surchargeMode || "amount");
  const [surchargeValue, setSurchargeValue] = useState(order?.surchargeValue || 0);
  const [discountMode, setDiscountMode] = useState<AdjustmentMode>(order?.discountMode || "amount");
  const [discountValue, setDiscountValue] = useState(order?.discountValue || 0);
  const [depositMode, setDepositMode] = useState<AdjustmentMode>(order?.depositMode || "amount");
  const [depositValue, setDepositValue] = useState(order?.depositValue ?? order?.deposit ?? 0);
  const financials = calculateFinancials({
    items,
    estimate: 0,
    deposit: 0,
    surchargeMode,
    surchargeValue,
    discountMode,
    discountValue,
    depositMode,
    depositValue,
  });
  const visibleTemplates = templateCategory === "Todas"
    ? QUICK_WORK_TEMPLATES
    : QUICK_WORK_TEMPLATES.filter((template) => template.category === templateCategory);

  const applyTemplate = (template: QuickWorkTemplate) => {
    setWork(template.work);
    setResult(template.result);
    setIssue((current) => current.trim() ? current : template.issue);
    setDiagnosis((current) => current.trim() ? current : template.diagnosis);
    setWarranty(template.warranty);
    setItems((current) => current.some((item) => item.unitPrice > 0) ? current : template.items.map((item) => ({ ...item, id: createItemId(), unitPrice: 0 })));
    setAppliedTemplate(template.id);
  };

  const updateItem = <K extends keyof BudgetItem>(id: string, key: K, value: BudgetItem[K]) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [key]: value } : item));
  };

  const handleInvalid = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const firstInvalid = form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(":invalid");
    if (!firstInvalid || event.target !== firstInvalid) return;
    const label = firstInvalid.closest("label")?.querySelector("span")?.textContent?.replace(" *", "") || "un campo obligatorio";
    setValidationMessage(`Falta completar: ${label}. Te llevamos al campo para que puedas crear la orden.`);
    window.requestAnimationFrame(() => {
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      firstInvalid.focus({ preventScroll: true });
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    setValidationMessage("");
    onSubmit(event);
  };

  return (
    <div className="modal-layer">
      <button className="modal-scrim" onClick={onClose} aria-label="Cerrar" />
      <form ref={dialogRef} className="order-form-modal" onSubmit={handleSubmit} onInvalidCapture={handleInvalid} key={order?.id || "new"} role="dialog" aria-modal="true" aria-labelledby="order-form-title" tabIndex={-1}>
        <header><div><span className="modal-kicker">{order ? `EDITANDO ORDEN / PRESUPUESTO #${order.id}` : "NUEVA ORDEN / PRESUPUESTO"}</span><h2 id="order-form-title">{order ? "Actualizar trabajo" : "Recibir y presupuestar"}</h2><p>Recepción, diagnóstico, trabajo, ítems y cobro en un mismo flujo.</p></div><button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar formulario"><X/></button></header>
        {validationMessage && <div className="form-validation-alert" role="alert"><HelpCircle/><span><strong>No pudimos crearla todavía.</strong>{validationMessage}</span></div>}
        <div className="form-scroll">
          <section className="form-section"><div className="form-section-title"><span>01</span><div><h3>Cliente</h3><p>Datos para el seguimiento y la entrega.</p></div></div><div className="field-grid three"><label className="field"><span>Nombre y apellido *</span><input name="client" defaultValue={order?.client} required placeholder="Nombre del cliente" /></label><label className="field"><span>WhatsApp / teléfono *</span><input name="phone" defaultValue={order?.phone} required inputMode="tel" placeholder="+54 9 ..." /></label><label className="field"><span>Email</span><input name="email" defaultValue={order?.email} type="email" placeholder="cliente@email.com" /></label></div></section>
          <section className="form-section"><div className="form-section-title"><span>02</span><div><h3>Equipo</h3><p>Identificación y estado al momento de recibirlo.</p></div></div><div className="field-grid four"><label className="field"><span>Tipo *</span><select name="deviceType" defaultValue={order?.deviceType || "Smartphone"}><option>Smartphone</option><option>Notebook</option><option>PC de escritorio</option><option>Tablet</option><option>Consola</option><option>Audio / accesorio</option><option>Otro</option></select></label><label className="field"><span>Marca *</span><input name="brand" defaultValue={order?.brand} required placeholder="Apple, Samsung..." /></label><label className="field"><span>Modelo *</span><input name="model" defaultValue={order?.model} required placeholder="iPhone 13 Pro" /></label><label className="field"><span>Serie / IMEI</span><input name="serial" defaultValue={order?.serial} placeholder="Escanear o escribir" /></label><label className="field wide-2"><span>Accesorios recibidos</span><input name="accessories" defaultValue={order?.accessories} placeholder="Funda, cargador, cable..." /></label><label className="field wide-2"><span>Estado físico de ingreso</span><input name="condition" defaultValue={order?.condition} placeholder="Golpes, marcas, humedad, piezas faltantes..." /></label></div></section>
          <section className="form-section work-section">
            <div className="form-section-title"><span>03</span><div><h3>Diagnóstico y trabajo</h3><p>Aplicá una plantilla recurrente o redactá el caso manualmente.</p></div></div>
            <div className="quick-template-header"><div className="template-category-tabs">{TEMPLATE_CATEGORIES.map((category) => <button key={category} type="button" className={templateCategory === category ? "active" : ""} onClick={() => setTemplateCategory(category)}>{category}</button>)}</div><small>{QUICK_WORK_TEMPLATES.length} trabajos frecuentes incluidos</small></div>
            <div className="quick-template-grid">
              {visibleTemplates.map((template) => <button type="button" key={template.id} className={appliedTemplate === template.id ? "active" : ""} onClick={() => applyTemplate(template)}><span><Wrench/></span><strong>{template.label}</strong><small>{template.summary}</small>{appliedTemplate === template.id && <Check/>}</button>)}
            </div>
            {appliedTemplate && <p className="template-feedback"><Check size={14}/> Plantilla aplicada: el trabajo realizado y los ítems sugeridos ya están cargados.</p>}
            <div className="field-grid two template-fields"><label className="field"><span>Falla informada *</span><textarea name="issue" value={issue} onChange={(event) => setIssue(event.target.value)} required rows={4} placeholder="¿Qué problema reporta el cliente?" /></label><label className="field"><span>Diagnóstico técnico</span><textarea name="diagnosis" value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} rows={4} placeholder="Mediciones, pruebas y causa probable..." /></label><label className="field wide"><span>Trabajo realizado</span><textarea name="work" value={work} onChange={(event) => setWork(event.target.value)} rows={5} placeholder="Tareas realizadas, repuestos y pruebas finales..." /></label><label className="field wide"><span>Resultado / pruebas finales</span><textarea name="result" value={result} onChange={(event) => setResult(event.target.value)} rows={2} placeholder="Resultado, funciones verificadas y pendientes..." /></label></div>
          </section>
          <section className="form-section budget-editor-section">
            <div className="form-section-title budget-section-title"><span>04</span><div><h3>Ítems y presupuesto</h3><p>Separá repuestos, insumos, servicios y mano de obra.</p></div><button type="button" className="add-line-button" onClick={() => setItems((current) => [...current, createBudgetItem("", "Servicio", warranty)])}><PlusCircle/>Agregar ítem</button></div>
            <input type="hidden" name="itemsJson" value={JSON.stringify(items)} />
            <div className="budget-items">
              {items.map((item, index) => (
                <div className="budget-item-row" key={item.id}>
                  <span className="item-number">{String(index + 1).padStart(2, "0")}</span>
                  <label className="mini-budget-field item-description"><span>Descripción</span><input value={item.detail} onChange={(event) => updateItem(item.id, "detail", event.target.value)} placeholder="Repuesto, servicio o mano de obra" /></label>
                  <label className="mini-budget-field"><span>Rubro</span><select value={item.category} onChange={(event) => updateItem(item.id, "category", event.target.value as BudgetItemCategory)}>{BUDGET_ITEM_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                  <label className="mini-budget-field"><span>Cant.</span><input type="number" min="0.01" step="0.01" value={item.qty} onChange={(event) => updateItem(item.id, "qty", Number(event.target.value) || 0)} /></label>
                  <label className="mini-budget-field"><span>Garantía</span><input type="number" min="0" value={item.warranty} onChange={(event) => updateItem(item.id, "warranty", Number(event.target.value) || 0)} /></label>
                  <label className="mini-budget-field"><span>Precio unit.</span><input type="number" min="0" step="100" value={item.unitPrice} onChange={(event) => updateItem(item.id, "unitPrice", Number(event.target.value) || 0)} /></label>
                  <strong className="item-total">{formatMoney(item.qty * item.unitPrice)}</strong>
                  <button type="button" className="remove-line" onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))} aria-label={`Eliminar ítem ${index + 1}`}><Trash2/></button>
                </div>
              ))}
              {!items.length && <button type="button" className="budget-empty" onClick={() => setItems([createBudgetItem("", "Servicio", warranty)])}><PlusCircle/><strong>Agregá el primer ítem</strong><span>También podés aplicar una plantilla rápida para cargar sugerencias.</span></button>}
            </div>
            <div className="budget-finance-grid">
              <div className="financial-inputs">
                <AdjustmentField label="Recargo" mode={surchargeMode} value={surchargeValue} setMode={setSurchargeMode} setValue={setSurchargeValue} name="surcharge" />
                <AdjustmentField label="Descuento" mode={discountMode} value={discountValue} setMode={setDiscountMode} setValue={setDiscountValue} name="discount" />
                <AdjustmentField label="Anticipo / cobro" mode={depositMode} value={depositValue} setMode={setDepositMode} setValue={setDepositValue} name="deposit" />
              </div>
              <div className="budget-totals" aria-live="polite"><div><span>Subtotal</span><strong>{formatMoney(financials.subtotal)}</strong></div>{financials.surcharge > 0 && <div><span>Recargo</span><strong>+ {formatMoney(financials.surcharge)}</strong></div>}{financials.discount > 0 && <div><span>Descuento</span><strong>- {formatMoney(financials.discount)}</strong></div>}<div className="grand-total"><span>Total</span><strong>{formatMoney(financials.total)}</strong></div><div className="balance-total"><span>Saldo pendiente</span><strong>{formatMoney(financials.balance)}</strong></div></div>
            </div>
          </section>
          <section className="form-section">
            <div className="form-section-title"><span>05</span><div><h3>Seguimiento y condiciones</h3><p>Estado operativo, validez, pago y observaciones del documento.</p></div></div>
            <div className="field-grid four"><label className="field"><span>Prioridad</span><select name="priority" defaultValue={order?.priority || "Normal"}><option>Normal</option><option>Alta</option><option>Urgente</option></select></label><label className="field"><span>Estado de la orden</span><select name="status" defaultValue={order?.status || "Ingresado"}>{STATUS_ORDER.map((status) => <option key={status}>{status}</option>)}</select></label><label className="field"><span>Estado del presupuesto</span><select name="budgetStatus" defaultValue={order ? budgetStatusFor(order) : "Borrador"}>{BUDGET_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label><label className="field"><span>Técnico</span><input name="technician" defaultValue={order?.technician || ownerName} /></label><label className="field"><span>Entrega estimada</span><input name="dueDate" type="date" defaultValue={initialDue} /></label><label className="field"><span>Validez (días)</span><input name="validityDays" type="number" min="1" max="365" defaultValue={order?.validityDays ?? 15} /></label><label className="field"><span>Forma de pago</span><select name="paymentMethod" defaultValue={order?.paymentMethod || "A convenir"}><option>A convenir</option><option>Efectivo</option><option>Transferencia</option><option>Débito / crédito</option><option>Mercado Pago</option><option>Cuenta corriente</option></select></label><label className="field"><span>Garantía general (días)</span><input name="warranty" type="number" min="0" value={warranty} onChange={(event) => setWarranty(Number(event.target.value) || 0)} /></label><label className="field wide"><span>Notas y condiciones particulares</span><textarea name="notes" defaultValue={order?.notes} rows={3} placeholder="Seña, repuestos sujetos a stock, exclusiones, contraseña temporal..." /></label></div>
          </section>
        </div>
        <footer><span><ShieldCheck/>Total {formatMoney(financials.total)} · Saldo {formatMoney(financials.balance)}</span><div><button type="button" className="text-button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit"><Save size={17}/>{order ? "Guardar cambios" : "Crear orden y presupuesto"}</button></div></footer>
      </form>
    </div>
  );
}

function AdjustmentField({ label, mode, value, setMode, setValue, name }: {
  label: string;
  mode: AdjustmentMode;
  value: number;
  setMode: (mode: AdjustmentMode) => void;
  setValue: (value: number) => void;
  name: "surcharge" | "discount" | "deposit";
}) {
  return <label className="adjustment-field"><span>{label}</span><div><select name={`${name}Mode`} value={mode} onChange={(event) => setMode(event.target.value as AdjustmentMode)} aria-label={`Unidad de ${label}`}><option value="amount">$</option><option value="percent">%</option></select><input name={`${name}Value`} type="number" min="0" max={mode === "percent" ? 100 : undefined} step={mode === "percent" ? "0.5" : "100"} value={value} onChange={(event) => setValue(Number(event.target.value) || 0)} /></div></label>;
}

function OrderDrawer({ order, settings, onClose, onEdit, onStatus, onWhatsApp, onShare, onDuplicate, onDelete, onNotify }: {
  order: RepairOrder;
  settings: AppSettings;
  onClose: () => void;
  onEdit: () => void;
  onStatus: (status: OrderStatus) => void;
  onWhatsApp: () => void;
  onShare: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onNotify: (message: string) => void;
}) {
  const financials = calculateFinancials(order);
  const orderItems = getOrderItems(order);
  const currentIndex = STATUS_ORDER.indexOf(order.status);
  const dialogRef = useDialogFocus<HTMLElement>();
  const [printDocument, setPrintDocument] = useState<"budget" | "order">("budget");
  const [pdfStatus, setPdfStatus] = useState<"budget" | "work-order" | null>(null);
  const downloadPdf = (kind: "budget" | "work-order") => {
    setPrintDocument(kind === "budget" ? "budget" : "order");
    setPdfStatus(kind);
    try {
      const filename = downloadWorkshopPdf({
        kind,
        business: {
          name: settings.businessName,
          tagline: settings.tagline,
          phone: settings.phone,
          address: settings.address,
        },
        order: {
          id: order.id,
          client: order.client,
          phone: order.phone,
          email: order.email,
          deviceType: order.deviceType,
          device: deviceLabel(order),
          serial: order.serial,
          accessories: order.accessories,
          condition: order.condition,
          issue: order.issue,
          diagnosis: order.diagnosis,
          work: order.work,
          result: order.result || "",
          notes: order.notes || "",
          status: order.status,
          budgetStatus: budgetStatusFor(order),
          priority: order.priority,
          technician: order.technician,
          receivedAt: order.receivedAt,
          dueDate: order.dueDate,
          paymentMethod: order.paymentMethod || "A convenir",
          validityDays: order.validityDays || 15,
          warranty: order.warranty,
        },
        items: orderItems.map(({ detail, category, qty, unitPrice, warranty }) => ({ detail, category, qty, unitPrice, warranty })),
        financials,
      });
      onNotify(`PDF descargado: ${filename}`);
    } catch {
      onNotify("No pudimos generar el PDF. Volvé a intentarlo.");
    } finally {
      setPdfStatus(null);
    }
  };
  return (
    <div className="drawer-layer">
      <button className="drawer-scrim" onClick={onClose} aria-label="Cerrar detalle" />
      <aside ref={dialogRef} className="order-drawer" role="dialog" aria-modal="true" aria-labelledby="order-detail-title" tabIndex={-1}>
        <header><div><span className="modal-kicker">ORDEN #{order.id}</span><h2 id="order-detail-title">{deviceLabel(order)}</h2><p>{order.client} · recibido el {formatDate(order.receivedAt)}</p></div><button onClick={onClose} className="modal-close" aria-label="Cerrar detalle"><X/></button></header>
        <div className="drawer-scroll">
          <section className="drawer-status"><div><span className={`status-dot ${STATUS_META[order.status].tone}`}/><span><small>Estado actual</small><strong>{order.status}</strong></span></div><select value={order.status} onChange={(event) => onStatus(event.target.value as OrderStatus)} aria-label="Cambiar estado">{STATUS_ORDER.map((status) => <option key={status}>{status}</option>)}</select></section>
          <section className="progress-track" aria-label="Progreso de la reparación">{STATUS_ORDER.slice(0, 6).map((status, index) => <span key={status} className={index <= Math.min(currentIndex, 5) ? "done" : ""}><i/>{STATUS_META[status].short}</span>)}</section>
          <section className="drawer-actions"><button onClick={onWhatsApp}><MessageCircle/>WhatsApp</button><button onClick={onShare}><Upload/>Compartir</button><button onClick={() => downloadPdf("budget")} disabled={Boolean(pdfStatus)} aria-busy={pdfStatus === "budget"}><FileDown/>{pdfStatus === "budget" ? "Generando…" : "PDF presupuesto"}</button><button onClick={() => downloadPdf("work-order")} disabled={Boolean(pdfStatus)} aria-busy={pdfStatus === "work-order"}><FileDown/>{pdfStatus === "work-order" ? "Generando…" : "PDF orden"}</button><button onClick={onDuplicate}><Copy/>Duplicar</button><button onClick={onEdit}><Pencil/>Editar</button></section>
          <section className="detail-block"><h3>Cliente y equipo</h3><dl><div><dt>Cliente</dt><dd>{order.client}</dd></div><div><dt>Teléfono</dt><dd><a href={`tel:${order.phone}`}>{order.phone}</a></dd></div><div><dt>Equipo</dt><dd>{order.deviceType}</dd></div><div><dt>Marca / modelo</dt><dd>{deviceLabel(order)}</dd></div><div><dt>Serie / IMEI</dt><dd>{order.serial || "No registrado"}</dd></div><div><dt>Accesorios</dt><dd>{order.accessories || "Sin accesorios"}</dd></div></dl></section>
          <section className="detail-block"><h3>Recepción y diagnóstico</h3><div className="detail-copy"><small>FALLA INFORMADA</small><p>{order.issue}</p></div><div className="detail-copy"><small>DIAGNÓSTICO</small><p>{order.diagnosis || "Todavía no se cargó un diagnóstico."}</p></div>{order.work && <div className="detail-copy"><small>TRABAJO REALIZADO</small><p>{order.work}</p></div>}{order.result && <div className="detail-copy"><small>RESULTADO / PRUEBAS</small><p>{order.result}</p></div>}<div className="condition-note"><ShieldCheck/><span><small>ESTADO DE INGRESO</small>{order.condition || "Sin observaciones"}</span></div></section>
          <section className="detail-block drawer-budget-detail"><h3>Ítems del presupuesto <span className={`budget-status tone-${budgetStatusFor(order).toLowerCase()}`}>{budgetStatusFor(order)}</span></h3><div className="drawer-items">{orderItems.map((item) => <div key={item.id}><span><strong>{item.detail}</strong><small>{item.category} · {item.qty} × {formatMoney(item.unitPrice)} · {item.warranty} días</small></span><b>{formatMoney(item.qty * item.unitPrice)}</b></div>)}{!orderItems.length && <p>Sin ítems cargados.</p>}</div></section>
          <section className="money-block"><div><span>Subtotal</span><strong>{formatMoney(financials.subtotal)}</strong></div>{financials.surcharge > 0 && <div><span>Recargo</span><strong>+ {formatMoney(financials.surcharge)}</strong></div>}{financials.discount > 0 && <div><span>Descuento</span><strong>- {formatMoney(financials.discount)}</strong></div>}<div><span>Total</span><strong>{formatMoney(financials.total)}</strong></div><div><span>Anticipo / cobro</span><strong>- {formatMoney(financials.deposit)}</strong></div><div className="balance"><span>Saldo pendiente</span><strong>{formatMoney(financials.balance)}</strong></div><small>{order.paymentMethod || "A convenir"} · Garantía general: {order.warranty} días · Técnico: {order.technician}</small></section>
          {order.notes && <section className="detail-block"><h3>Notas y condiciones</h3><div className="detail-copy"><p>{order.notes}</p></div></section>}
          <button className="delete-order" onClick={onDelete}><Trash2/>Eliminar esta orden</button>
        </div>
        <div className="print-sheet">{printDocument === "budget" ? <BudgetPrintDocument order={order} settings={settings}/> : <WorkOrderPrintDocument order={order} settings={settings}/>}</div>
      </aside>
    </div>
  );
}

function DocumentHeader({ settings, order, title }: { settings: AppSettings; order: RepairOrder; title: string }) {
  return <header className="document-header"><div><strong>{settings.businessName || "TallerOS"}</strong><span>{settings.tagline}</span><small>{[settings.phone, settings.address].filter(Boolean).join(" · ")}</small></div><div><b>{title}</b><strong>#{order.id}</strong><span>{formatDate(order.receivedAt)}</span></div></header>;
}

function BudgetPrintDocument({ order, settings }: { order: RepairOrder; settings: AppSettings }) {
  const financials = calculateFinancials(order);
  const items = getOrderItems(order);
  return <article className="document-page budget-document">
    <DocumentHeader settings={settings} order={order} title="PRESUPUESTO"/>
    <div className="document-strip"><span>Estado <b>{budgetStatusFor(order)}</b></span><span>Validez <b>{order.validityDays || 15} días</b></span><span>Forma de pago <b>{order.paymentMethod || "A convenir"}</b></span></div>
    <section className="document-info-grid"><div><small>CLIENTE</small><strong>{order.client}</strong></div><div><small>TELÉFONO</small><strong>{order.phone}</strong></div><div><small>EQUIPO</small><strong>{deviceLabel(order)}</strong></div><div><small>SERIE / IMEI</small><strong>{order.serial || "—"}</strong></div></section>
    <section className="document-copy"><div><h2>Falla informada</h2><p>{order.issue}</p></div><div><h2>Diagnóstico</h2><p>{order.diagnosis || "Pendiente de diagnóstico."}</p></div><div className="wide"><h2>Trabajo propuesto / realizado</h2><p>{order.work || "Pendiente de definir."}</p></div></section>
    <table className="document-items"><thead><tr><th>Cant.</th><th>Detalle</th><th>Rubro</th><th>Garantía</th><th>Importe</th></tr></thead><tbody>{items.length ? items.map((item) => <tr key={item.id}><td>{item.qty}</td><td>{item.detail}</td><td>{item.category}</td><td>{item.warranty} días</td><td>{formatMoney(item.qty * item.unitPrice)}</td></tr>) : <tr><td>—</td><td>Sin ítems cargados</td><td>—</td><td>—</td><td>{formatMoney(0)}</td></tr>}</tbody></table>
    <section className="document-bottom"><div className="document-terms"><h2>Condiciones</h2><ol><li>El presupuesto es válido por {order.validityDays || 15} días y está sujeto a disponibilidad de repuestos.</li><li>La garantía cubre únicamente el trabajo y los componentes detallados; no cubre golpes, humedad, manipulación ni fallas ajenas.</li><li>La intervención comienza con la aprobación del cliente. Los datos deben estar respaldados antes de tareas que puedan afectar el sistema.</li></ol>{order.notes && <p><b>Observaciones:</b> {order.notes}</p>}</div><div className="document-finance"><div><span>Subtotal</span><b>{formatMoney(financials.subtotal)}</b></div>{financials.surcharge > 0 && <div><span>Recargo</span><b>{formatMoney(financials.surcharge)}</b></div>}{financials.discount > 0 && <div><span>Descuento</span><b>- {formatMoney(financials.discount)}</b></div>}<div className="total"><span>Total</span><b>{formatMoney(financials.total)}</b></div><div><span>Anticipo</span><b>{formatMoney(financials.deposit)}</b></div><div className="balance"><span>Saldo</span><b>{formatMoney(financials.balance)}</b></div></div></section>
    <footer className="document-signatures"><div><span/><strong>Cliente / responsable</strong><small>Acepto alcance, presupuesto y condiciones</small></div><div><span/><strong>{order.technician}</strong><small>Técnico responsable</small></div></footer>
  </article>;
}

function WorkOrderPrintDocument({ order, settings }: { order: RepairOrder; settings: AppSettings }) {
  return <article className="document-page work-order-document">
    <DocumentHeader settings={settings} order={order} title="ORDEN DE TRABAJO"/>
    <div className="document-strip"><span>Estado <b>{order.status}</b></span><span>Prioridad <b>{order.priority}</b></span><span>Técnico <b>{order.technician}</b></span></div>
    <section className="document-info-grid"><div><small>CLIENTE</small><strong>{order.client}</strong></div><div><small>CONTACTO</small><strong>{order.phone}</strong></div><div><small>EQUIPO</small><strong>{order.deviceType} · {deviceLabel(order)}</strong></div><div><small>SERIE / IMEI</small><strong>{order.serial || "—"}</strong></div><div><small>ACCESORIOS</small><strong>{order.accessories || "Sin accesorios"}</strong></div><div><small>ENTREGA ESTIMADA</small><strong>{formatDate(order.dueDate)}</strong></div></section>
    <section className="document-condition"><h2>Estado físico de ingreso</h2><p>{order.condition || "Sin observaciones registradas."}</p></section>
    <section className="document-copy"><div><h2>Falla informada</h2><p>{order.issue}</p></div><div><h2>Diagnóstico técnico</h2><p>{order.diagnosis || "Pendiente."}</p></div><div className="wide"><h2>Trabajo realizado</h2><p>{order.work || "Pendiente."}</p></div><div className="wide"><h2>Resultado y pruebas finales</h2><p>{order.result || "Pendiente de completar."}</p></div></section>
    <section className="work-checklist"><h2>Control de entrega</h2><div><span>□ Encendido / reinicio</span><span>□ Carga y batería</span><span>□ Audio / micrófono</span><span>□ Cámaras / pantalla</span><span>□ Conectividad</span><span>□ Datos / cuentas</span></div></section>
    <footer className="document-signatures"><div><span/><strong>Cliente / responsable</strong><small>Recibí el equipo y los accesorios indicados</small></div><div><span/><strong>{order.technician}</strong><small>Trabajo y pruebas documentadas</small></div></footer>
  </article>;
}
