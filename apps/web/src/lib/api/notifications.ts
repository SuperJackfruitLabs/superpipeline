/** A board's notifications. */
import { ApiError } from '../loading';
import { fetch, headers } from './client';

export interface Notification {
  seq: number;
  kind: string;
  cardId: string;
  body: string;
  read: boolean;
  createdAt: string;
}

/** In-app notification feed (docs/07 §7). */
export async function getNotifications(boardId: string): Promise<Notification[]> {
  const res = await fetch(`/v1/boards/${boardId}/notifications`, { headers });
  if (!res.ok) throw new ApiError('getNotifications', res.status);
  return ((await res.json()) as { notifications: Notification[] }).notifications;
}

export function markNotificationRead(boardId: string, seq: number): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/notifications/${seq}/read`, { method: 'POST', headers });
}
