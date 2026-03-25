# Decision Document — VyOS File Browser

## Approach Summary

The file browser will be a **REST-based SFTP file browser** following the terminal feature's architectural pattern (SSH-based, not VyOS config API). It uses `asyncssh`'s native SFTP client — already a dependency — to perform structured file operations against VyOS routers.

The backend is a single FastAPI router with REST endpoints for listing directories, reading/downloading files, uploading files, and managing files (rename, delete, mkdir). The frontend is a dedicated page under `system/` with a table-based file browser UI, breadcrumb path navigation, file preview for text files, and upload/download dialogs.

This is **not** a VyOS config feature — it does not use the mapper/builder/pyvyos pattern. Like the terminal and monitoring features, it operates directly over SSH infrastructure.

## Key Decisions

### 1. REST endpoints, not WebSocket
The terminal uses WebSocket for persistent bidirectional PTY I/O. File browsing is request/response — list a directory, download a file, upload a file. REST fits perfectly and matches the majority of the codebase.

### 2. Use asyncssh SFTP client (not SSH command execution)
SFTP provides structured operations (`readdir`, `stat`, `open`, `write`) that return typed metadata. Parsing `ls -la` output is fragile. asyncssh supports SFTP natively via `conn.start_sftp_client()`. Handles binary files cleanly.

### 3. New `FILE_BROWSER` FeatureGroup with ADMIN-only default
File system access is privileged. It gets its own FeatureGroup rather than piggybacking on MONITORING. ADMIN/OPERATOR → WRITE, VIEWER → NONE.

### 4. Full filesystem access with path validation
Admin-gated, so restricting paths would reduce utility. Protect against path traversal by canonicalizing paths server-side and rejecting `..` and null bytes. SFTP naturally operates within SSH user's OS permissions.

### 5. Stream file downloads through `StreamingResponse`
Read from SFTP in chunks, yield to `StreamingResponse`. Avoids loading large files into memory. Proxy updated to pass binary streams through.

### 6. Text file preview in browser, download-only for binary
View logs, configs, scripts in-browser (high-value). Binary files download directly. Determine text vs. binary via extension heuristics + null-byte detection. Preview up to ~1 MB.

### 7. Multipart upload through updated proxy
FastAPI `UploadFile` receives the file, writes via SFTP. The VyOS proxy route must be updated to handle `multipart/form-data` (mirroring the session proxy pattern).

### 8. Ephemeral SFTP connections per request
No connection pooling. Each request opens SSH+SFTP and closes when done. Simpler, and file browser operations are infrequent. Terminal takes the same approach.

## What to Reuse

- `asyncssh` library + SFTP client
- SSH credential storage/decryption (`ssh_key_manager.py`)
- Instance SSH config from database (same pattern as `terminal.py`)
- RBAC infrastructure (`FeatureGroup`, `check_permission`, permission decorators)
- Auth/session middleware chain
- Frontend: `apiClient`, `PageHeader`, `ErrorAlert`, `EmptyState`, `Table`, `Breadcrumb`, `Dialog`, `ScrollArea`, `Skeleton`
- Frontend: `usePermissions` hook

## What to Build

### Backend (new files)
- `backend/routers/file_browser/file_browser.py` — REST router with SFTP operations
- `backend/routers/file_browser/__init__.py` — package init

### Backend (modified files)
- `backend/rbac_permissions.py` — add `FILE_BROWSER` to FeatureGroup + built-in permissions
- `backend/app.py` — register file browser router

### Frontend (new files)
- `frontend/src/lib/api/types/file-browser.ts` — TypeScript interfaces
- `frontend/src/lib/api/file-browser.ts` — API service class
- `frontend/src/app/(default)/(app)/system/file-browser/page.tsx` — page
- `frontend/src/components/file-browser/FileBrowserContent.tsx` — main component
- `frontend/src/components/file-browser/FilePreviewModal.tsx` — text file viewer
- `frontend/src/components/file-browser/UploadFileModal.tsx` — upload dialog
- `frontend/src/components/file-browser/CreateDirectoryModal.tsx` — mkdir dialog
- `frontend/src/components/file-browser/DeleteConfirmModal.tsx` — delete confirmation
- `frontend/src/components/file-browser/RenameModal.tsx` — rename dialog

### Frontend (modified files)
- `frontend/src/lib/api/user-management.ts` — add `FILE_BROWSER` to frontend FeatureGroup enum
- `frontend/src/components/layout/Sidebar.tsx` — add nav item
- `frontend/src/app/api/vyos/[...path]/route.ts` — handle binary responses + multipart uploads

## What NOT to Do

- No mapper/builder pattern — this isn't VyOS config
- No WebSocket — REST is sufficient
- No connection pooling — premature optimization
- No file editing in-browser — preview only (editing config via text editor bypasses VyOS validation)
- No recursive directory operations — delete/download one item at a time
- No path restriction allow-lists — rely on RBAC + OS permissions

## API Design

```
GET  /vyos/file-browser/list?path=/home/vyos
GET  /vyos/file-browser/read?path=/path/to/file&max_size=1048576
GET  /vyos/file-browser/download?path=/path/to/file
POST /vyos/file-browser/upload  (multipart: path + file)
POST /vyos/file-browser/mkdir   (JSON: { path })
POST /vyos/file-browser/rename  (JSON: { old_path, new_path })
DELETE /vyos/file-browser/delete?path=/path/to/file
```

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Proxy doesn't handle binary/multipart | Medium | Mirror session proxy pattern — already demonstrated |
| Large file downloads exhaust memory | Medium | True streaming via chunked SFTP read + StreamingResponse |
| SSH not configured on instance | Low | Check SSH config, show "SSH Not Configured" card (like terminal) |
| Remote permission errors | Low | Catch SFTP errors, return clear 403 messages |
| No VyOS version differences | None | SFTP is version-agnostic |

## Task Outline (High-Level)

1. **Phase 1 — Prerequisites**: Add FeatureGroup, update permissions
2. **Phase 2 — Backend**: Create SFTP helper + file browser router + registration
3. **Phase 3 — Proxy**: Update VyOS proxy for binary/multipart support
4. **Phase 4 — Frontend**: Types, API service, page, components, navigation
5. **Phase 5 — Validation**: TypeScript compile, lint, manual verification
