import { parseExcelFile } from './excelParser';
import { WorkReportItem } from '../types';

const DB_NAME = 'WorkReportFolderDB';
const STORE_NAME = 'handles';

// Save directory handle in IndexedDB
export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(handle, 'watchedFolderHandle');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

// Get stored directory handle from IndexedDB
export async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        resolve(null);
        return;
      }
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get('watchedFolderHandle');
      getReq.onsuccess = () => {
        resolve(getReq.result || null);
      };
      getReq.onerror = () => resolve(null);
    };
    request.onerror = () => resolve(null);
  });
}

// Recursively scan DirectoryHandle for .xlsx, .xls, .csv files
export async function scanDirectoryHandleRecursively(
  dirHandle: FileSystemDirectoryHandle,
  pathPrefix = ''
): Promise<{ file: File; relativePath: string }[]> {
  const fileEntries: { file: File; relativePath: string }[] = [];

  // @ts-ignore - async iterator on dirHandle
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      const name = entry.name;
      if (
        (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) &&
        !name.startsWith('~$')
      ) {
        try {
          const fileHandle = entry as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          fileEntries.push({
            file,
            relativePath: pathPrefix ? `${pathPrefix}/${name}` : name,
          });
        } catch (e) {
          console.warn('Error reading file handle:', name, e);
        }
      }
    } else if (entry.kind === 'directory') {
      try {
        const subDirHandle = entry as FileSystemDirectoryHandle;
        const subEntries = await scanDirectoryHandleRecursively(
          subDirHandle,
          pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name
        );
        fileEntries.push(...subEntries);
      } catch (e) {
        console.warn('Error reading subdir handle:', entry.name, e);
      }
    }
  }

  return fileEntries;
}

// Parse FileList or File[] array into WorkReportItem list
export async function parseFileList(files: FileList | File[]): Promise<{
  reports: WorkReportItem[];
  fileNames: string[];
}> {
  const allReports: WorkReportItem[] = [];
  const fileNames: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = file.name;
    if (
      (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) &&
      !name.startsWith('~$')
    ) {
      fileNames.push(name);
      try {
        const parsed = await parseExcelFile(file);
        allReports.push(...parsed);
      } catch (err) {
        console.error('Failed to parse excel file:', name, err);
      }
    }
  }

  return { reports: allReports, fileNames };
}

// Perform scan using stored handle or prompt
export async function performFolderScan(): Promise<{
  reports: WorkReportItem[];
  fileNames: string[];
  scannedFolderName?: string;
  needFolderPermission?: boolean;
}> {
  const storedHandle = await getStoredDirectoryHandle();

  if (storedHandle) {
    try {
      let perm = 'prompt';
      if ('queryPermission' in storedHandle) {
        // @ts-ignore
        perm = await storedHandle.queryPermission({ mode: 'read' });
      }

      if (perm === 'granted') {
        const entries = await scanDirectoryHandleRecursively(storedHandle);
        const files = entries.map((e) => e.file);
        const { reports, fileNames } = await parseFileList(files);
        return {
          reports,
          fileNames,
          scannedFolderName: storedHandle.name,
          needFolderPermission: false,
        };
      } else if ('requestPermission' in storedHandle) {
        // Try requesting permission
        // @ts-ignore
        const reqPerm = await storedHandle.requestPermission({ mode: 'read' });
        if (reqPerm === 'granted') {
          const entries = await scanDirectoryHandleRecursively(storedHandle);
          const files = entries.map((e) => e.file);
          const { reports, fileNames } = await parseFileList(files);
          return {
            reports,
            fileNames,
            scannedFolderName: storedHandle.name,
            needFolderPermission: false,
          };
        }
      }
    } catch (err) {
      console.warn('Stored handle scan failed:', err);
    }
  }

  return {
    reports: [],
    fileNames: [],
    needFolderPermission: true,
  };
}
