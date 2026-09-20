import { Request, Response } from "express";
import * as svc from "./notifications.service";
import { ok } from "@poramma/dto";

function userIdOf(req: Request): string {
  return (req as any).userId as string;
}

export async function listNotifications(req: Request, res: Response) {
  const { type, status, unreadOnly } = req.query;
  const notifications = await svc.listNotifications(userIdOf(req), {
    type: typeof type === "string" ? type : undefined,
    status: typeof status === "string" ? status : undefined,
    unreadOnly: unreadOnly === "true",
  });
  const unreadCount = await svc.getUnreadCount(userIdOf(req));
  res.json(ok({ notifications, unreadCount }));
}

export async function markAsRead(req: Request, res: Response) {
  await svc.markAsRead(userIdOf(req), req.params.id);
  res.status(204).send();
}

export async function markAllAsRead(req: Request, res: Response) {
  await svc.markAllAsRead(userIdOf(req));
  res.status(204).send();
}
