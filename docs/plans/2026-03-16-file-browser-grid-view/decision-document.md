# Decision Document — File Browser Grid View

## Approach Summary

Add a layout toggle to `FileBrowserContent.tsx` that lets users switch between the existing table view and a new grid/tile view. The table view code stays inline in `FileBrowserContent.tsx`. The grid view is extracted into a new `FileGridView.tsx` component that receives the same data and callbacks as props.

The toggle is a pair of icon buttons (LayoutList / LayoutGrid) placed in the breadcrumb bar area. Layout state is a simple `useState<"table" | "grid">` — no persistence needed beyond the current session (it survives navigation since it's component state).

## Key Decisions

### 1. Grid tile component as a separate file
The grid view has enough visual complexity (tile card, icon sizing, hover actions, responsive grid) to warrant its own component file rather than inlining 100+ lines into `FileBrowserContent.tsx`.

### 2. Tile design: card-based with large icon, name, and size
Each tile is a bordered card with:
- Large file/folder icon (centered, ~10-12 w/h)
- Filename below (truncated with ellipsis)
- File size as subtle label (directories show item count or "—")
- Hover overlay with action buttons (download, rename, delete)
- Directories get a distinct blue-tinted background on hover

### 3. Actions via hover overlay on tiles
Since tiles don't have a dedicated action column, actions appear as an overlay on hover (top-right corner). This mirrors how OS file managers handle icon view actions. The overlay includes the same buttons as the table: download (files only), rename, delete.

### 4. Parent directory ("..") tile when not at root
Same as the table view — a special tile at the start of the grid that navigates up.

### 5. Layout toggle in the breadcrumb bar
Two icon buttons side-by-side between the breadcrumb and the loading spinner. Active state uses `bg-accent` styling. This keeps the PageHeader clean and puts the toggle near the content it controls.

### 6. Responsive grid with CSS Grid
`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6` — responsive columns that adjust to screen width. Tiles are equal-sized squares-ish (aspect-ratio not forced, just natural content height).

## What to Reuse
- `FileIcon` helper (already exists, just needs a `size` variant for grid)
- `formatFileSize` helper
- `buildPathSegments`, `navigateToParent`
- All state management and handlers from `FileBrowserContent.tsx`
- All existing modals (unchanged)
- `EmptyState` component for empty directory in grid view

## What to Build
- `FileGridView.tsx` — new component: renders the grid of tiles
- Modify `FileBrowserContent.tsx` — add layout state + toggle + conditional rendering

## What NOT to Do
- No drag-and-drop in grid view (out of scope)
- No thumbnail previews for image files (out of scope)
- No persistent layout preference (localStorage) — keep it simple
- No context menu (right-click) — hover overlay is sufficient
- No animation on layout switch — just swap views

## Risk Assessment
| Risk | Severity | Mitigation |
|------|----------|------------|
| Hover actions not discoverable on touch | Low | Touch users can still tap to navigate, and table view remains available |
| Long filenames overflow tiles | Low | Truncate with `truncate` class + title tooltip |

## Task Outline
1. Create `FileGridView.tsx` component with tile grid and hover actions
2. Modify `FileBrowserContent.tsx` to add layout toggle and conditional rendering
3. Validate TypeScript + lint
