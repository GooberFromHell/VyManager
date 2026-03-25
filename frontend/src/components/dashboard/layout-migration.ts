interface DashboardCard {
  id: string;
  type: string;
  column: number;
  position: number;
  span: number;
  height?: number;
  config?: Record<string, unknown>;
}

interface DashboardLayout {
  cards: DashboardCard[];
}

/**
 * Converts old 3-column dashboard layouts to 12-column format.
 *
 * Old format: column 0-2, span 1-3
 * New format: column 0-11, span 3-12 (multiples of 4 for migrated cards)
 *
 * Detection: a layout needs migration when every card has span <= 3 and
 * column <= 2 — values that only make sense in the old 3-column grid.
 */
export function migrateLayout(layout: DashboardLayout): DashboardLayout {
  // Check if already migrated (any card has span > 3)
  const needsMigration =
    layout.cards.length > 0 &&
    layout.cards.every((c) => c.span <= 3 && c.column <= 2);
  if (!needsMigration) return layout;

  return {
    cards: layout.cards.map((card) => ({
      ...card,
      column: card.column * 4, // 0→0, 1→4, 2→8
      span: card.span * 4, // 1→4, 2→8, 3→12
      height: card.height ?? 2, // default to standard height
    })),
  };
}
