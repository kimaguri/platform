import { SQLDatabase } from 'encore.dev/storage/sqldb';
import { randomUUID } from 'crypto';
import { ConversionEvent, AuditLogEntry } from '../types/events';

/**
 * logConversionActivity logs a conversion-related event to the audit trail.
 * @param db The database connection.
 * @param params The parameters for logging the event.
 */
export async function logConversionActivity(
  db: SQLDatabase,
  params: {
    event: ConversionEvent;
    tenantId: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  },
): Promise<void> {
  const { event, tenantId, userId, ipAddress, userAgent } = params;
  const id = randomUUID();

  // The 'details' column can store a summary of the event payload for quick filtering/display.
  const details = event.payload;

  await db.exec`
    INSERT INTO conversion_audit_logs (id, tenant_id, user_id, event_type, event, details, ip_address, user_agent)
    VALUES (${id}, ${tenantId}, ${userId}, ${event.type}, ${JSON.stringify(event)}, ${JSON.stringify(details)}, ${ipAddress}, ${userAgent})
  `;
}

/**
 * getAuditTrail retrieves the audit trail for a specific tenant.
 * @param db The database connection.
 * @param params The parameters for retrieving the audit trail.
 * @returns A promise that resolves to an array of audit log entries.
 */
export async function getAuditTrail(
  db: SQLDatabase,
  params: { tenantId: string; limit?: number; offset?: number },
): Promise<AuditLogEntry[]> {
  const { tenantId, limit = 50, offset = 0 } = params;

  // Convert AsyncGenerator to array
  const rows = [];
  for await (const row of db.query`
    SELECT 
      id, 
      tenant_id as tenant_id, 
      timestamp, 
      user_id as user_id, 
      event, 
      event_type as event_type, 
      details, 
      ip_address as ip_address, 
      user_agent as user_agent
    FROM conversion_audit_logs 
    WHERE tenant_id = ${tenantId}
    ORDER BY timestamp DESC 
    LIMIT ${limit} OFFSET ${offset}
  `) {
    rows.push(row);
  }

  // The 'event' and 'details' columns are stored as JSON strings in the DB.
  // We need to parse them back into objects and map to correct field names.
  return rows.map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    timestamp: row.timestamp,
    userId: row.user_id,
    event: typeof row.event === 'string' ? JSON.parse(row.event) : row.event,
    eventType: row.event_type,
    details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
  }));
}
