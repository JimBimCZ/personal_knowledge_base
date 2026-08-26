import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * A local projection of the identity provider's subject — nothing more.
 *
 * There are deliberately no credentials here, and there never will be: the IdP
 * owns authentication (see CLAUDE.md §3). `role` is a snapshot of what the
 * token said at last sign-in, kept for display and for the admin view. It is
 * never the source of truth for authorization — the guard reads the token
 * claim on every request.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sub: text("sub").notNull().unique(),
    displayName: text("display_name"),
    email: text("email"),
    roleSnapshot: text("role_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("users_sub_idx").on(table.sub)],
);

export type User = typeof users.$inferSelect;
