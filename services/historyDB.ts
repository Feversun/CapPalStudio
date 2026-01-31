/**
 * IndexedDB Service for Sticker History Persistence
 * Stores generated images locally for offline access and history browsing.
 */

const DB_NAME = 'StickerGenHistory';
const DB_VERSION = 1;
const STORE_NAME = 'stickers';

export interface HistoryItem {
    id: string;
    emotion: string;
    emoji: string;
    imageUrl: string;  // base64 data URL
    finalPrompt?: string;
    mode: string;      // 'pack' | 'sheet' | 'widget'
    style: string;
    timestamp: number;
}

let db: IDBDatabase | null = null;

/**
 * Initialize the IndexedDB database
 */
export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Failed to open IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;

            // Create object store if it doesn't exist
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('mode', 'mode', { unique: false });
            }
        };
    });
};

/**
 * Save a sticker to history
 */
export const saveToHistory = async (item: HistoryItem): Promise<void> => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(item);

        request.onerror = () => {
            console.error('Failed to save to history:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve();
        };
    });
};

/**
 * Get all history items, sorted by timestamp (newest first)
 */
export const getHistory = async (limit?: number): Promise<HistoryItem[]> => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev'); // Descending order

        const items: HistoryItem[] = [];
        let count = 0;

        request.onerror = () => {
            reject(request.error);
        };

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

            if (cursor && (!limit || count < limit)) {
                items.push(cursor.value);
                count++;
                cursor.continue();
            } else {
                resolve(items);
            }
        };
    });
};

/**
 * Delete a history item by ID
 */
export const deleteFromHistory = async (id: string): Promise<void> => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

/**
 * Clear all history
 */
export const clearHistory = async (): Promise<void> => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

/**
 * Get history count
 */
export const getHistoryCount = async (): Promise<number> => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.count();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};
