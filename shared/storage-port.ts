export interface StorageAdapter {
  prisma: any; // Adapter must provide prisma client instance. Keep narrow and replace `any` with your prisma client type in server adapter.
}

let storageAdapter: StorageAdapter | null = null;

export function registerStorageAdapter(adapter: StorageAdapter) {
  storageAdapter = adapter;
}

export function getStorage(): StorageAdapter {
  if (!storageAdapter) {
    throw new Error('Storage adapter not registered. In server entrypoint call registerStorageAdapter({ prisma }) from shared/storage-port.');
  }
  return storageAdapter;
}
