import { pgTable, uuid, varchar, timestamp, text, index } from 'drizzle-orm/pg-core';

export const webhookLogs = pgTable('webhook_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: varchar('event_id', { length: 255 }).notNull().unique(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(), // 'processing', 'completed', 'failed'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  eventIdIdx: index('webhook_logs_event_id_idx').on(table.eventId),
  eventTypeIdx: index('webhook_logs_event_type_idx').on(table.eventType),
  statusIdx: index('webhook_logs_status_idx').on(table.status),
  createdAtIdx: index('webhook_logs_created_at_idx').on(table.createdAt)
}));
