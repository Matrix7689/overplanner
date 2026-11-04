import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  ids: string[];
  onReorder: (ids: string[]) => void;
  renderCard: (id: string) => ReactNode;
};

// Cards in up to three columns, filled left to right (card 1, 2, 3 across the
// top row, and so on), so the order reads like Google Keep's. Cards can be
// dragged to a new place: with a mouse after a few pixels of movement, on a
// touch screen after a short long-press, so clicks and scrolling still work.
// Other cards make room live while dragging; the new order is reported on drop.
export function SortableCardGrid({ ids, onReorder, renderCard }: Props) {
  const columns = useColumnCount();
  const [draft, setDraft] = useState<string[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const lastMove = useRef(0);
  const order = draft ?? ids;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setDraft(ids);
  };

  // Move the dragged card into the hovered card's place. A short cooldown
  // stops two cards of different heights from swapping back and forth.
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || over.id === active.id) return;
    const now = Date.now();
    if (now - lastMove.current < 120) return;
    lastMove.current = now;
    setDraft((current) => {
      const list = current ?? ids;
      const from = list.indexOf(String(active.id));
      const to = list.indexOf(String(over.id));
      if (from < 0 || to < 0) return list;
      const next = [...list];
      next.splice(from, 1);
      next.splice(to, 0, String(active.id));
      return next;
    });
  };

  const finish = (save: boolean) => {
    if (save && draft && draft.join() !== ids.join()) onReorder(draft);
    setDraft(null);
    setActiveId(null);
  };

  const cols: string[][] = Array.from({ length: columns }, () => []);
  order.forEach((id, i) => cols[i % columns].push(id));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={() => finish(true)}
      onDragCancel={() => finish(false)}
    >
      <div className="grid items-start gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {cols.map((col, i) => (
          <div key={i} className="flex min-w-0 flex-col gap-4">
            {col.map((id) => (
              <SortableCard key={id} id={id} placeholder={id === activeId}>
                {renderCard(id)}
              </SortableCard>
            ))}
          </div>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeId ? <div className="rotate-1 cursor-grabbing rounded-xl shadow-2xl">{renderCard(activeId)}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableCard({ id, placeholder, children }: { id: string; placeholder: boolean; children: ReactNode }) {
  const drag = useDraggable({ id });
  const drop = useDroppable({ id });
  return (
    <div
      ref={(el) => {
        drag.setNodeRef(el);
        drop.setNodeRef(el);
      }}
      {...drag.listeners}
      aria-roledescription="draggable card"
      className={`rounded-xl transition-opacity ${placeholder ? "opacity-30" : ""}`}
    >
      {children}
    </div>
  );
}

// 1 column on phones, 2 on tablets, 3 from 1024px.
function useColumnCount(): number {
  const count = () => (matchMedia("(min-width: 1024px)").matches ? 3 : matchMedia("(min-width: 640px)").matches ? 2 : 1);
  const [columns, setColumns] = useState(count);
  useEffect(() => {
    const queries = [matchMedia("(min-width: 1024px)"), matchMedia("(min-width: 640px)")];
    const update = () => setColumns(count());
    queries.forEach((q) => q.addEventListener("change", update));
    return () => queries.forEach((q) => q.removeEventListener("change", update));
  }, []);
  return columns;
}
