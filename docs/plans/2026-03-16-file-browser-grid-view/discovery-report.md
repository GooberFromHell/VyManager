# Discovery Report — File Browser Grid View

**Index tier:** TIER 1 (cached)
**Project index:** `.derpo/` (commit: 536af59)

## Project Patterns
See `.derpo/architecture.md` for full patterns. No deviations needed.

## Goal-Specific Research

The existing `FileBrowserContent.tsx` (417 lines) is a single component that:
- Manages all state: path, entries, loading, error, modals
- Contains helper functions: `formatFileSize`, `FileIcon`, `buildPathSegments`, `navigateToParent`
- Renders: PageHeader → Breadcrumb nav → Table → Modals
- Has handlers: `handleNavigate`, `handleEntryClick`, `handleDownload`, `afterMutation`

Key observations:
1. The table view is rendered inline (~130 lines of JSX in the return statement)
2. All state and handlers are in the parent component — layout views just need to consume them as props
3. The `FileIcon` component and `formatFileSize` helper are reusable across both layouts
4. No existing toggle/view-switcher pattern in the codebase — this will be new

## Reference Implementations
- `FileBrowserContent.tsx` — the table layout to keep intact
- Existing dropdown/toggle patterns: lucide-react icons `LayoutGrid` and `LayoutList` available for toggle buttons

## Gaps
- No grid/tile view component exists
- No layout toggle UI pattern exists in the file browser
- Context menu or hover actions needed for grid tiles (since there's no action column)

## Dependencies
- None — purely additive frontend work
