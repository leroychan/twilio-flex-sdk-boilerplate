import { useFlexStore } from '@/store';
import {
  getTaskParticipants,
  addTaskParticipantListener,
  type TaskParticipantEventName,
} from '@/lib/flex/actions/Task';
import { fetchWorkerInfo } from '@/lib/flex/workspace';
import type { TaskParticipant } from '@twilio/flex-sdk/actions/Task';
import type { TaskParticipantView } from '@/store/slices/tasks';

type Store = { getState: () => ReturnType<typeof useFlexStore.getState> };

function toView(p: TaskParticipant): TaskParticipantView {
  return {
    participantSid: p.participantSid,
    type: String(p.type),
    channelType: String(p.channelType),
    workerSid: p.routingProperties?.workerSid ?? undefined,
    isOnHold: 'isOnHold' in p ? Boolean((p as { isOnHold?: boolean }).isOnHold) : false,
  };
}

async function resolveName(store: Store, workerSid: string): Promise<void> {
  const info = await fetchWorkerInfo(workerSid);
  const name = (info?.attributes as { full_name?: string } | undefined)?.full_name ?? info?.name;
  if (name) store.getState().setWorkerName(workerSid, name);
}

/**
 * Seed a task's participants into the store, resolve other agents' names, and
 * register the three participant listeners. Returns an unsubscribe that removes
 * the listeners and clears the store entry.
 */
export async function subscribeTaskParticipants(
  taskSid: string,
  selfWorkerSid: string,
  store: Store = useFlexStore as unknown as Store,
): Promise<() => void> {
  const participants = await getTaskParticipants(taskSid);
  store.getState().setTaskParticipants(
    taskSid,
    participants.map(toView),
  );

  participants
    .filter(
      (p) =>
        String(p.type) === 'agent' &&
        p.routingProperties?.workerSid &&
        p.routingProperties.workerSid !== selfWorkerSid,
    )
    .forEach((p) => void resolveName(store, p.routingProperties!.workerSid!));

  const events: TaskParticipantEventName[] = [
    'participantAdded',
    'participantModified',
    'participantRemoved',
  ];
  const subs = await Promise.all(
    events.map((ev) =>
      addTaskParticipantListener(taskSid, ev, (_task, participant) => {
        if (ev === 'participantRemoved') {
          store.getState().removeTaskParticipant(taskSid, participant.participantSid);
        } else {
          store.getState().upsertTaskParticipant(taskSid, toView(participant));
        }
      }).catch(() => ({ unsubscribe: () => undefined })),
    ),
  );

  return () => {
    subs.forEach((s) => s.unsubscribe?.());
    store.getState().setTaskParticipants(taskSid, []);
  };
}
