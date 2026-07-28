'use client';

import type { Workspace, WorkerInfo } from '@twilio/flex-sdk/taskrouter';
import { getFlexClient } from './client';

// Cached TaskRouter Workspace handle. Workspace methods (fetchWorkerInfo,
// fetchWorkersInfo, fetchTaskQueues) are NOT Action classes — they're called
// directly on the handle returned by client.getWorkspace().
let workspace: Workspace | null = null;

export async function getWorkspace(): Promise<Workspace | null> {
  if (workspace) return workspace;
  const client = getFlexClient();
  if (!client) return null;
  workspace = await client.getWorkspace();
  return workspace;
}

/** Resolve a single worker's info (name/attributes). Returns null on failure. */
export async function fetchWorkerInfo(workerSid: string): Promise<WorkerInfo | null> {
  const ws = await getWorkspace();
  if (!ws) return null;
  try {
    return await ws.fetchWorkerInfo(workerSid);
  } catch {
    return null;
  }
}

/** Serializable projection of a TaskRouter TaskQueue for transfer-target pickers. */
export interface QueueInfo {
  sid: string;
  name: string;
}

/** Serializable projection of a WorkerInfo for the directory / supervisor roster. */
export interface WorkerDirectoryInfo {
  sid: string;
  name: string;
  activitySid: string;
  activityName: string;
  available: boolean;
  attributes: Record<string, unknown>;
}

/** All task queues (sid + name), for queue transfer targets. Empty on failure. */
export async function fetchTaskQueuesList(): Promise<QueueInfo[]> {
  const ws = await getWorkspace();
  if (!ws) return [];
  try {
    const map = await ws.fetchTaskQueues();
    return Array.from(map.values()).map((q) => ({ sid: q.sid, name: q.name }));
  } catch {
    return [];
  }
}

/** All workers (directory projection), for agent transfer targets + supervisor roster. */
export async function fetchWorkersList(): Promise<WorkerDirectoryInfo[]> {
  const ws = await getWorkspace();
  if (!ws) return [];
  try {
    const map = await ws.fetchWorkersInfo();
    return Array.from(map.values()).map((w) => ({
      sid: w.sid,
      name: w.name || w.friendlyName || w.sid,
      activitySid: w.activitySid,
      activityName: w.activityName,
      available: w.available,
      attributes: w.attributes ?? {},
    }));
  } catch {
    return [];
  }
}

export function resetWorkspaceCache(): void {
  workspace = null;
}
