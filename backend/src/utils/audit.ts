import { prisma } from '../config/prisma';
import type { Prisma } from '@prisma/client';

export async function createAuditLog(params: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue | null;
}) {
  const { actorId, action, entity, entityId, metadata } = params;

  return prisma.auditLog.create({
    data: {
      actorId: actorId ?? undefined,
      action,
      entity,
      entityId,
      metadata: metadata ?? undefined
    }
  });
}

export default createAuditLog;
