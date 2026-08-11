export type OfflineOperation = { operation: string; payload: Record<string, unknown>; idempotencyKey: string }
const DB_NAME = "jirani-offline"
const STORE = "operations"

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "idempotencyKey" })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function queueOfflineOperation(operation: OfflineOperation) {
  if (typeof indexedDB === "undefined") return false
  const db = await openDb()
  return new Promise<boolean>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put({ ...operation, createdAt: Date.now() })
    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
  })
}

export async function getOfflineOperations() {
  if (typeof indexedDB === "undefined") return [] as OfflineOperation[]
  const db = await openDb()
  return new Promise<OfflineOperation[]>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll()
    request.onsuccess = () => resolve(request.result as OfflineOperation[])
    request.onerror = () => reject(request.error)
  })
}

export async function clearOfflineOperation(idempotencyKey: string) {
  const db = await openDb()
  db.transaction(STORE, "readwrite").objectStore(STORE).delete(idempotencyKey)
}
