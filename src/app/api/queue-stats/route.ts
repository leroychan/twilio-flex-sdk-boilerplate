import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Node runtime: uses the twilio REST SDK (server-only). Never import
// @twilio/flex-sdk here — that library is browser-only.
export const runtime = 'nodejs';

interface QueueEnv {
  accountSid: string;
  authToken: string;
  workspaceSid: string;
}

function readQueueEnv(): QueueEnv | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
  const workspaceSid = process.env.TWILIO_WORKSPACE_SID ?? '';
  if (!accountSid || !authToken || !workspaceSid) return null;
  return { accountSid, authToken, workspaceSid };
}

export async function GET(): Promise<Response> {
  const env = readQueueEnv();
  if (!env) {
    // Stub-ready: no live creds → the UI shows its "not configured" placeholder.
    return NextResponse.json({ configured: false });
  }

  try {
    const client = twilio(env.accountSid, env.authToken);
    const ws = client.taskrouter.v1.workspaces(env.workspaceSid);
    const queues = await ws.taskQueues.list({ limit: 200 });

    const projected = await Promise.all(
      queues.map(async (q) => {
        try {
          const stats = await ws.taskQueues(q.sid).statistics().fetch();
          // The SDK types statistics loosely; read the documented shape.
          const rt = (stats as { realtime?: Record<string, unknown> }).realtime ?? {};
          const cum = (stats as { cumulative?: Record<string, unknown> }).cumulative ?? {};
          const byStatus = (rt.tasks_by_status as Record<string, number>) ?? {};
          const waitAccepted =
            (cum.wait_duration_until_accepted as { avg?: number } | undefined)?.avg ?? 0;
          return {
            sid: q.sid,
            friendlyName: q.friendlyName,
            waiting: (byStatus.pending ?? 0) + (byStatus.reserved ?? 0),
            active: byStatus.assigned ?? 0,
            longestWaitAge: (rt.longest_task_waiting_age as number) ?? 0,
            availableWorkers: (rt.total_available_workers as number) ?? 0,
            eligibleWorkers: (rt.total_eligible_workers as number) ?? 0,
            avgWaitAccepted: waitAccepted,
          };
        } catch {
          return {
            sid: q.sid,
            friendlyName: q.friendlyName,
            waiting: 0,
            active: 0,
            longestWaitAge: 0,
            availableWorkers: 0,
            eligibleWorkers: 0,
            avgWaitAccepted: 0,
          };
        }
      }),
    );

    return NextResponse.json({
      configured: true,
      updatedAt: new Date().toISOString(),
      queues: projected,
    });
  } catch {
    return NextResponse.json({ error: 'queue_stats_failed' }, { status: 500 });
  }
}
