"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Plus, Save, Edit3, X, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Github, Globe, MessageCircle, Sparkles, ArrowUpCircle, Tag } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useSession } from "@/lib/auth-client";
import { useSessionStore } from "@/store/session-store";
import { dashboardService, DashboardCard, DashboardLayout } from "@/lib/api/dashboard";
import { versionService, VersionCheckResponse } from "@/lib/api/version";
import { getWidget } from "@/components/dashboard/widget-registry";
import { migrateLayout } from "@/components/dashboard/layout-migration";
import { AddCardModal } from "@/components/dashboard/AddCardModal";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ApiError } from "@/lib/types/api";
import { DashboardDataProvider } from "@/contexts/DashboardDataContext";
import { WelcomeCard } from "@/components/layout/WelcomeCard";

// Sortable card wrapper component
function SortableCard({ card, children }: { card: DashboardCard; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "cursor-grabbing" : "cursor-grab"} ${isOver ? "ring-2 ring-primary ring-offset-2" : ""
        }`}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

// Droppable column overlay (for drag targeting only)
function DroppableColumnOverlay({
  columnId,
  editMode,
  hasCards,
  isDragging,
}: {
  columnId: string;
  editMode: boolean;
  hasCards: boolean;
  isDragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  if (!editMode) return null;

  const zoneIndex = parseInt(columnId.split("-")[1]);
  const zoneLabels = ["Left", "Center", "Right"];

  return (
    <div
      ref={setNodeRef}
      className={`relative h-full min-h-[800px] rounded-lg transition-all ${isOver
          ? "bg-primary/30 border-4 border-primary border-solid shadow-2xl"
          : isDragging
            ? "border-2 border-dashed border-primary/50 bg-primary/5"
            : "border-2 border-dashed border-border/20 bg-transparent"
        }`}
    >
      <div className={`flex flex-col items-center justify-center h-full text-lg font-bold pointer-events-none ${isDragging ? "opacity-100 text-primary" : "opacity-30 text-muted-foreground"
        }`}>
        <div>{zoneLabels[zoneIndex]} Zone</div>
        {isDragging && <div className="text-sm font-normal mt-2">Drop here</div>}
      </div>
    </div>
  );
}

export default function Home() {
  const [isChecking, setIsChecking] = useState(true);
  const { data: session, isPending } = useSession();
  const { activeSession } = useSessionStore();

  // Dashboard state
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [addCardModalOpen, setAddCardModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [canEditDashboard, setCanEditDashboard] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionCheckResponse | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load dashboard layout
  const loadDashboard = async () => {
    try {
      const response = await dashboardService.getLayout();
      if (response.exists && response.layout) {
        // Ensure all cards have span and height properties (backward compatibility)
        const cardsWithDefaults = (response.layout.cards || []).map((card) => {
          const reg = getWidget(card.type);
          return {
            ...card,
            span: card.span ?? reg?.defaultSpan ?? 4,
            height: card.height ?? reg?.defaultHeight ?? 2,
          };
        });
        // Migrate old 3-column layouts to 12-column format
        const migrated = migrateLayout({ cards: cardsWithDefaults });
        setCards(migrated.cards);
      } else {
        setCards([]);
      }
    } catch (err) {
      // Extract error message for logging
      const errorMessage = (err as ApiError).message || (err as ApiError).message || (err as ApiError).message || "Unknown error";
      console.error("Failed to load dashboard layout:", errorMessage);
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      if (isPending) {
        return;
      }

      // AuthGuard ensures session is valid — load dashboard data directly
      await loadDashboard();

      // Check for version updates
      versionService.checkVersion().then(setVersionInfo).catch(() => {});

      // Check if user has permission to edit the dashboard layout
      try {
        const perms = await fetch("/api/vyos/permissions", { credentials: "include" });
        if (perms.ok) {
          const data = await perms.json();
          setCanEditDashboard(data["DASHBOARD"] === "WRITE");
        }
      } catch {
        // If permissions check fails, default to no edit access
      }

      setIsChecking(false);
    };

    loadDashboardData();
  }, [isPending]);

  if (isPending || isChecking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Handler functions
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (!over) {
      return;
    }

    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) {
      return;
    }

    const cardSpan = activeCard.span || 4;
    let targetColumn = 0;
    let targetPosition = 0;

    // Check if dropped on a column zone
    const columnMatch = over.id.toString().match(/^column-(\d+)$/);
    if (columnMatch) {
      // Drop zones map to 12-col positions: zone 0→col 0, 1→col 4, 2→col 8
      targetColumn = parseInt(columnMatch[1]) * 4;
      console.log(`[Drag] Dropped on zone ${columnMatch[1]}, mapped to column ${targetColumn}`);
    } else {
      // Check if dropped on another card
      const overCard = cards.find((c) => c.id === over.id);
      if (!overCard) {
        console.log(`[Drag] Dropped on unknown target: ${over.id}`);
        return;
      }

      // Don't do anything if dropping on itself
      if (activeCard.id === overCard.id) {
        return;
      }

      // Use the overCard's column and position as target
      targetColumn = overCard.column;
      targetPosition = overCard.position;
      console.log(`[Drag] Dropped on card at column=${targetColumn}, position=${targetPosition}`);
    }

    // SMART VALIDATION: Adjust column if span would overflow the 12-column grid
    const maxStartColumn = 12 - cardSpan;
    if (targetColumn > maxStartColumn) {
      targetColumn = maxStartColumn;
    }

    // Build occupancy map from all existing cards (excluding the one being moved)
    const rowOccupancy: Map<number, Set<number>> = new Map();
    for (const card of cards) {
      if (card.id === activeCard.id) continue;

      const span = card.span || 4;
      const startCol = card.column;
      const endCol = Math.min(startCol + span - 1, 11);

      if (!rowOccupancy.has(card.position)) {
        rowOccupancy.set(card.position, new Set());
      }

      for (let col = startCol; col <= endCol; col++) {
        rowOccupancy.get(card.position)!.add(col);
      }
    }

    // If dropped on a column overlay, find next available row
    // If dropped on a card, try to use that card's position first
    if (columnMatch) {
      targetPosition = 0; // Start from top for column drops
    }

    // Find first available row where this card can fit
    const endCol = targetColumn + cardSpan - 1;
    let finalPosition = targetPosition;

    while (finalPosition < 100) {
      const occupied = rowOccupancy.get(finalPosition);
      if (!occupied) {
        // Row is completely empty
        break;
      }

      // Check if columns needed for this card are free
      let allFree = true;
      for (let col = targetColumn; col <= endCol; col++) {
        if (occupied.has(col)) {
          allFree = false;
          break;
        }
      }

      if (allFree) {
        // Found a free spot
        break;
      }

      finalPosition++;
    }

    const updatedCards = cards.map((c) => {
      if (c.id === activeCard.id) {
        return { ...c, column: targetColumn, position: finalPosition };
      }
      return c;
    });

    console.log(`[Drag] Placed card: column=${targetColumn}, position=${finalPosition}, span=${cardSpan}`);

    setCards(updatedCards);
    setHasUnsavedChanges(true);
  };

  const handleAddCard = (cardType: string) => {
    // Look up defaults from the widget registry
    const reg = getWidget(cardType);
    const defaultSpan = reg?.defaultSpan ?? 4;
    const defaultHeight = reg?.defaultHeight ?? 2;

    // New cards always start at column 0
    const targetColumn = 0;

    // Build occupancy map from existing cards
    const rowOccupancy: Map<number, Set<number>> = new Map();
    for (const card of cards) {
      const span = card.span || 4;
      const startCol = card.column;
      const endCol = Math.min(startCol + span - 1, 11);

      if (!rowOccupancy.has(card.position)) {
        rowOccupancy.set(card.position, new Set());
      }

      for (let col = startCol; col <= endCol; col++) {
        rowOccupancy.get(card.position)!.add(col);
      }
    }

    // Find first available row where this card can fit
    let targetPosition = 0;
    const endCol = targetColumn + defaultSpan - 1;

    while (targetPosition < 100) {
      const occupied = rowOccupancy.get(targetPosition);
      if (!occupied) {
        // Row is completely empty
        break;
      }

      // Check if columns needed for this card are free
      let allFree = true;
      for (let col = targetColumn; col <= endCol; col++) {
        if (occupied.has(col)) {
          allFree = false;
          break;
        }
      }

      if (allFree) {
        break;
      }

      targetPosition++;
    }

    const newCard: DashboardCard = {
      id: `card-${Date.now()}`,
      type: cardType,
      column: targetColumn,
      position: targetPosition,
      span: defaultSpan,
      height: defaultHeight,
    };

    setCards([...cards, newCard]);
    setHasUnsavedChanges(true);
  };

  const handleRemoveCard = (cardId: string) => {
    setCards(cards.filter((c) => c.id !== cardId));
    setHasUnsavedChanges(true);
  };

  const handleCardSpanChange = (cardId: string, newSpan: number) => {
    setCards(cards.map((c) => {
      if (c.id === cardId) {
        return { ...c, span: newSpan };
      }
      return c;
    }));
    setHasUnsavedChanges(true);
  };

  const handleCardHeightChange = (cardId: string, newHeight: number) => {
    setCards(cards.map((c) => {
      if (c.id === cardId) {
        return { ...c, height: newHeight };
      }
      return c;
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const layout: DashboardLayout = { cards };
      await dashboardService.saveLayout(layout);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Failed to save dashboard layout:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    // Reload the dashboard from the saved state, discarding changes
    await loadDashboard();
    setHasUnsavedChanges(false);
  };

  const handleCardConfigChange = (cardId: string, config: Record<string, unknown>) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, config } : c))
    );
    setHasUnsavedChanges(true);
  };

  const renderCard = (card: DashboardCard) => {
    const reg = getWidget(card.type);
    if (!reg) return null;

    const Component = reg.component;
    const baseProps = {
      id: card.id,
      config: card.config ?? {},
      span: card.span || 4,
      height: card.height ?? 2,
      editMode,
      onRemove: editMode ? () => handleRemoveCard(card.id) : undefined,
      onSpanChange: editMode ? (newSpan: number) => handleCardSpanChange(card.id, newSpan) : undefined,
      onHeightChange: editMode ? (newHeight: number) => handleCardHeightChange(card.id, newHeight) : undefined,
      onConfigChange: editMode
        ? (config: Record<string, unknown>) => handleCardConfigChange(card.id, config)
        : undefined,
    };

    return <Component {...baseProps} />;
  };

  // Get grid placement classes and styles for explicit positioning (12-column grid)
  const getGridClasses = (card: DashboardCard) => {
    const span = card.span || 4;

    // Column span classes
    const spanMap: Record<number, string> = {
      3: "col-span-3",
      4: "col-span-4",
      6: "col-span-6",
      8: "col-span-8",
      12: "col-span-12",
    };

    // Column start classes (1-indexed for CSS grid)
    const startMap: Record<number, string> = {
      0: "",          // col-start-1 is the default
      1: "col-start-2",
      2: "col-start-3",
      3: "col-start-4",
      4: "col-start-5",
      5: "col-start-6",
      6: "col-start-7",
      7: "col-start-8",
      8: "col-start-9",
      9: "col-start-10",
    };

    const spanClass = spanMap[span] || `col-span-${span}`;
    const startClass = startMap[card.column] || "";

    return [spanClass, startClass].filter(Boolean).join(" ");
  };

  const getGridStyle = (card: DashboardCard) => {
    const height = card.height ?? 2;
    return {
      gridRow: card.position + 1,
      minHeight: `${height * 260}px`,
    };
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome to VyManager - Professional VyOS Management Interface
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEditDashboard && (
              <>
                {hasUnsavedChanges && (
                  <>
                    <Button variant="outline" onClick={handleCancel} disabled={saving}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save Layout"}
                    </Button>
                  </>
                )}
                {editMode && (
                  <Button onClick={() => setAddCardModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Card
                  </Button>
                )}
                <Button
                  variant={editMode ? "default" : "outline"}
                  onClick={() => setEditMode(!editMode)}
                >
                  {editMode ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Exit Edit
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Dashboard
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Beta Information Card */}
        <div className="mt-6 relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-cyan-500/5 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
          <div className="relative p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Open Beta</span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              {versionInfo && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    v{versionInfo.current_version}
                  </span>
                  {versionInfo.environment === "dev" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                      dev
                    </span>
                  )}
                </div>
              )}

              {versionInfo?.update_available && (
                <a
                  href={versionInfo.release_url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-medium transition-colors"
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  v{versionInfo.latest_version} available
                </a>
              )}

              <div className="flex items-center gap-2">
                <Github className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Development by</span>
                <a
                  href="https://github.com/Community-VyProjects/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 font-medium transition-colors underline decoration-primary/30 hover:decoration-primary/60"
                >
                  VyProjects Org
                </a>
              </div>

              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href="https://vyprojects.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 font-medium transition-colors underline decoration-primary/30 hover:decoration-primary/60"
                >
                  Website
                </a>
              </div>

              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Join our</span>
                <a
                  href="https://discord.gg/4mE6QsZtKm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-500 hover:text-purple-400 font-medium transition-colors underline decoration-purple-500/30 hover:decoration-purple-500/60"
                >
                  Discord
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Dashboard Grid */}
      <DashboardDataProvider>
        {cards.length === 0 && !editMode ? (
          <EmptyState
            icon={LayoutDashboard}
            title="Your dashboard is empty"
            description={canEditDashboard ? "Click \"Edit Dashboard\" to add cards." : undefined}
            action={canEditDashboard ? { label: "Edit Dashboard", onClick: () => setEditMode(true), icon: Edit3 } : undefined}
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            {/* Wrapper for grid and overlays */}
            <div className="relative">
              {/* Main grid with explicit card placement */}
              <div className="grid grid-cols-12 gap-6 auto-rows-min relative z-0">
                <WelcomeCard />
                <SortableContext
                  items={cards.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {/* Render cards with explicit grid placement */}
                  {cards.map((card) => {
                    const cardElement = editMode ? (
                      <SortableCard key={card.id} card={card}>
                        {renderCard(card)}
                      </SortableCard>
                    ) : (
                      <div key={card.id}>{renderCard(card)}</div>
                    );

                    return (
                      <div
                        key={card.id}
                        className={getGridClasses(card)}
                        style={getGridStyle(card)}
                      >
                        {cardElement}
                      </div>
                    );
                  })}
                </SortableContext>
              </div>

              {/* Droppable column overlays (always visible in edit mode) */}
              {/* 3 drop zones spanning the 12-column grid: zone 0→cols 0-3, zone 1→cols 4-7, zone 2→cols 8-11 */}
              {editMode && (
                <div className={`absolute inset-0 grid grid-cols-3 gap-6 z-20 ${activeId ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                  <DroppableColumnOverlay
                    columnId="column-0"
                    editMode={editMode}
                    hasCards={cards.some(c => c.column >= 0 && c.column < 4)}
                    isDragging={!!activeId}
                  />
                  <DroppableColumnOverlay
                    columnId="column-1"
                    editMode={editMode}
                    hasCards={cards.some(c => c.column >= 4 && c.column < 8)}
                    isDragging={!!activeId}
                  />
                  <DroppableColumnOverlay
                    columnId="column-2"
                    editMode={editMode}
                    hasCards={cards.some(c => c.column >= 8 && c.column < 12)}
                    isDragging={!!activeId}
                  />
                </div>
              )}
            </div>

            {/* Drag Overlay - Shows the card being dragged */}
            <DragOverlay>
              {activeId ? (
                <div className="opacity-80 cursor-grabbing">
                  {renderCard(cards.find((c) => c.id === activeId)!)}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Add Card Modal */}
        <AddCardModal
          open={addCardModalOpen}
          onOpenChange={setAddCardModalOpen}
          onAddCard={handleAddCard}
        />
      </DashboardDataProvider>
    </div>
  );
}
