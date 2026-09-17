import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('msgmagnet_offline.db');
    await initTables(dbInstance);
  }
  return dbInstance;
};

const initTables = async (db: SQLite.SQLiteDatabase) => {
  try {
    // 1. Cached Contacts
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_contacts (
        id INTEGER PRIMARY KEY,
        name TEXT,
        mobile TEXT,
        email TEXT,
        company TEXT,
        job_title TEXT,
        lead_temperature TEXT,
        pipeline_stage TEXT,
        event_id INTEGER,
        lat REAL,
        lng REAL,
        notes TEXT,
        synced_at TEXT
      );
    `);

    // 2. Cached Tasks
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_tasks (
        id INTEGER PRIMARY KEY,
        title TEXT,
        due_date TEXT,
        status TEXT,
        priority TEXT,
        source TEXT,
        contact_id INTEGER,
        synced_at TEXT
      );
    `);

    // 3. Offline Sync Queue
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_sync_queue (
        queue_id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `);
  } catch (err) {
    console.error('Error initializing SQLite offline tables:', err);
  }
};

// Queue helper operations
export const enqueueAction = async (actionType: 'scan' | 'task' | 'pipeline' | 'location', payload: any) => {
  const db = await getDatabase();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO offline_sync_queue (action_type, payload, status, created_at) VALUES (?, ?, ?, ?)',
    [actionType, JSON.stringify(payload), 'pending', createdAt]
  );
};

export const getPendingQueue = async () => {
  const db = await getDatabase();
  return await db.getAllAsync<{
    queue_id: number;
    action_type: string;
    payload: string;
    attempts: number;
  }>("SELECT * FROM offline_sync_queue WHERE status = 'pending' ORDER BY queue_id ASC");
};

export const markQueueProcessed = async (queueId: number) => {
  const db = await getDatabase();
  await db.runAsync("UPDATE offline_sync_queue SET status = 'completed' WHERE queue_id = ?", [queueId]);
};

export const incrementQueueAttempts = async (queueId: number) => {
  const db = await getDatabase();
  await db.runAsync('UPDATE offline_sync_queue SET attempts = attempts + 1 WHERE queue_id = ?', [queueId]);
};

export const cacheContacts = async (contacts: any[]) => {
  const db = await getDatabase();
  const syncedAt = new Date().toISOString();
  for (const c of contacts) {
    await db.runAsync(
      `INSERT OR REPLACE INTO cached_contacts 
       (id, name, mobile, email, company, job_title, lead_temperature, pipeline_stage, event_id, lat, lng, notes, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        c.name || '',
        c.mobile || '',
        c.email || '',
        c.company || '',
        c.job_title || '',
        c.lead_temperature || 'warm',
        c.pipeline_stage || 'new_scanned',
        c.event_id || null,
        c.lat || null,
        c.lng || null,
        c.notes || '',
        syncedAt,
      ]
    );
  }
};

export const getCachedContacts = async () => {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM cached_contacts ORDER BY id DESC');
};
