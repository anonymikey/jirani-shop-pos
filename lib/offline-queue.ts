export type OfflineOperation = {
  operation: "checkout"
  payload: Record<string, unknown>
  idempotencyKey: string
  status: "pending" | "failed"
  attempts: number
  lastError?: string
  nextRetryAt: number
  createdAt: number
}

const DB_NAME = "jirani-offline"
const STORE = "operations"
const CATALOG_STORE = "catalog"

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "idempotencyKey" })
      if (!db.objectStoreNames.contains(CATALOG_STORE)) db.createObjectStore(CATALOG_STORE, { keyPath: "key" })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function queueOfflineOperation(operation: Omit<OfflineOperation, "status" | "attempts" | "nextRetryAt" | "createdAt">) {
  if (typeof indexedDB === "undefined") return false
  const db = await openDb()
  return new Promise<boolean>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put({ ...operation, status: "pending", attempts: 0, nextRetryAt: Date.now(), createdAt: Date.now() })
    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
  })
}

export async function getOfflineOperations() {
  if (typeof indexedDB === "undefined") return [] as OfflineOperation[]
  const db = await openDb()
  return new Promise<OfflineOperation[]>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll()
    request.onsuccess = () => resolve((request.result as OfflineOperation[]).sort((a, b) => a.createdAt - b.createdAt))
    request.onerror = () => reject(request.error)
  })
}

export async function updateOfflineOperation(idempotencyKey: string, patch: Partial<OfflineOperation>) {
  const current = (await getOfflineOperations()).find((operation) => operation.idempotencyKey === idempotencyKey)
  if (!current) return
  const db = await openDb()
  db.transaction(STORE, "readwrite").objectStore(STORE).put({ ...current, ...patch })
}

export async function saveOfflineCatalog(products: unknown[]) {
  if (typeof indexedDB === "undefined") return
  const db = await openDb()
  db.transaction(CATALOG_STORE, "readwrite").objectStore(CATALOG_STORE).put({ key: "products", value: products, updatedAt: Date.now() })
}

export async function getOfflineCatalog<T>() {
  if (typeof indexedDB === "undefined") return null as T | null
  const db = await openDb()
  return new Promise<T | null>((resolve, reject) => {
    const request = db.transaction(CATALOG_STORE, "readonly").objectStore(CATALOG_STORE).get("products")
    request.onsuccess = () => resolve((request.result?.value as T | undefined) ?? null)
    request.onerror = () => reject(request.error)
  })
}

export async function clearOfflineOperation(idempotencyKey: string) {
  if (typeof indexedDB === "undefined") return
  const db = await openDb()
  db.transaction(STORE, "readwrite").objectStore(STORE).delete(idempotencyKey)
}
