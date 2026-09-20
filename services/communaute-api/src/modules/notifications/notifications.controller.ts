import { Request, Response } from "express";
import { notificationsLogic } from "@poramma/ambassade-core";
import { ok } from "@poramma/dto";
import { db } from "../../db/connection";
import { toPublicNotification } from "../../shared/public-mappers";

const userIdOf = (req: Request) => (req as any).userId as string;

/** GET /notifications — les notifications du membre + le compteur de non lues (le scope est toujours le userId du token). */
export async function listNotifications(req: Request, res: Response) {
  const userId = userIdOf(req);
  const [rows, unreadCount] = await Promise.all([
    notificationsLogic.listNotifications(db, userId, { unreadOnly: req.query.unreadOnly === "true" }),
    notificationsLogic.getUnreadCount(db, userId),
  ]);
  res.json(ok({ notifications: rows.map(toPublicNotification), unreadCount }));
}

export async function getUnreadCount(req: Request, res: Response) {
  res.json(ok({ unreadCount: await notificationsLogic.getUnreadCount(db, userIdOf(req)) }));
}

export async function markAsRead(req: Request, res: Response) {
  await notificationsLogic.markAsRead(db, userIdOf(req), req.params.id);
  res.status(204).send();
}

export async function markAllAsRead(req: Request, res: Response) {
  await notificationsLogic.markAllAsRead(db, userIdOf(req));
  res.status(204).send();
}
