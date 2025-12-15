import { pgTable, uuid, varchar, timestamp, text, jsonb, boolean, integer, index } from 'drizzle-orm/pg-core';

export const eventTracking = pgTable('event_tracking', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: varchar('event_id', { length: 255 }).notNull().unique(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }),
  streamKey: varchar('stream_key', { length: 100 }).notNull(),
  sourceApplication: varchar('source_application', { length: 50 }).notNull(),
  targetApplication: varchar('target_application', { length: 50 }).notNull(),
  eventData: jsonb('event_data').default({}),
  publishedBy: varchar('published_by', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  status: varchar('status', { length: 50 }).notNull(), // 'published', 'failed'
  errorMessage: text('error_message'),
  isRetryable: boolean('is_retryable').default(true),
  retryCount: integer('retry_count').default(0),
  lastRetryAt: timestamp('last_retry_at'),
  publishedAt: timestamp('published_at').defaultNow(),
  acknowledged: boolean('acknowledged').default(false),
  acknowledgedAt: timestamp('acknowledged_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  eventIdIdx: index('event_tracking_event_id_idx').on(table.eventId),
  eventTypeIdx: index('event_tracking_event_type_idx').on(table.eventType),
  tenantIdIdx: index('event_tracking_tenant_id_idx').on(table.tenantId),
  statusIdx: index('event_tracking_status_idx').on(table.status),
  publishedAtIdx: index('event_tracking_published_at_idx').on(table.publishedAt),
  createdAtIdx: index('event_tracking_created_at_idx').on(table.createdAt)
}));
