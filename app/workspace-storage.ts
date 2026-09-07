export type PersistedWorkspace = {
  version: 3;
  savedAt: string;
  orders: unknown;
  settings: unknown;
};

export type WorkspaceSaveResult = {
  savedAt: string;
  drivers: Array<"indexeddb" | "localstorage">;
};

const DATABASE_NAME = "talleros-pwa";
const DATABASE_VERSION = 1;
const STORE_NAME = "workspace";
const WORKSPACE_KEY = "current-v3";
const LOCAL_WORKSPACE_KEY = "talleros:workspace:v3";
const LEGACY_WORKSPACE_KEYS = ["talleros:workspace", "talleros:orders", "talleros:settings"];

function isWorkspace(value: unknown): value is PersistedWorkspace {
  return Boolean(
    value &&
      typeof value === "object" &&
      "orders" in value &&
      "settings" in value &&
      "savedAt" in value &&
      typeof (value as PersistedWorkspace).savedAt === "string",
  );
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB no disponible"));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("No se pudo abrir IndexedDB"));
    request.onblocked = () => reject(new Error("IndexedDB bloqueado por otra pestana"));
  });
}

async function readIndexedWorkspace() {
  const database = await openDatabase();
  try {
    return await new Promise<PersistedWorkspace | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(WORKSPACE_KEY);
      request.onsuccess = () => resolve(isWorkspace(request.result) ? request.result : null);
      request.onerror = () => reject(request.error || new Error("No se pudo leer IndexedDB"));
    });
  } finally {
    database.close();
  }
}

async function writeIndexedWorkspace(workspace: PersistedWorkspace) {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(workspace, WORKSPACE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("No se pudo guardar en IndexedDB"));
      transaction.onabort = () => reject(transaction.error || new Error("Guardado cancelado en IndexedDB"));
    });
  } finally {
    database.close();
  }
}

async function clearLegacyIndexedWorkspace() {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete("current");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("No se pudo limpiar el espacio anterior"));
      transaction.onabort = () => reject(transaction.error || new Error("Limpieza cancelada en IndexedDB"));
    });
  } finally {
    database.close();
  }
}

function readLocalWorkspace() {
  try {
    const current = localStorage.getItem(LOCAL_WORKSPACE_KEY);
    if (current) {
      const parsed = JSON.parse(current);
      if (isWorkspace(parsed)) return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

function clearLegacyLocalWorkspace() {
  LEGACY_WORKSPACE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // The v3 namespace still starts clean when storage access is restricted.
    }
  });
}

function writeLocalWorkspace(workspace: PersistedWorkspace) {
  localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify(workspace));
}

export async function loadWorkspace() {
  const localWorkspace = readLocalWorkspace();
  let indexedWorkspace: PersistedWorkspace | null = null;
  try {
    indexedWorkspace = await readIndexedWorkspace();
  } catch {
    // LocalStorage remains a complete fallback on browsers without IndexedDB.
  }

  clearLegacyLocalWorkspace();
  try {
    await clearLegacyIndexedWorkspace();
  } catch {
    // The new namespace is enough to guarantee a clean start if cleanup is blocked.
  }

  if (!indexedWorkspace) return localWorkspace;
  if (!localWorkspace) return indexedWorkspace;
  return Date.parse(indexedWorkspace.savedAt) >= Date.parse(localWorkspace.savedAt)
    ? indexedWorkspace
    : localWorkspace;
}

export async function saveWorkspace(orders: unknown, settings: unknown): Promise<WorkspaceSaveResult> {
  const workspace: PersistedWorkspace = {
    version: 3,
    savedAt: new Date().toISOString(),
    orders,
    settings,
  };
  const drivers: WorkspaceSaveResult["drivers"] = [];

  try {
    writeLocalWorkspace(workspace);
    drivers.push("localstorage");
  } catch {
    // IndexedDB usually provides more capacity and remains available as fallback.
  }

  try {
    await writeIndexedWorkspace(workspace);
    drivers.push("indexeddb");
  } catch {
    // A successful localStorage write still counts as durable local persistence.
  }

  if (!drivers.length) throw new Error("No hay almacenamiento persistente disponible");
  return { savedAt: workspace.savedAt, drivers };
}
