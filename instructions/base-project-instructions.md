# The spec — what you build
A browser-only file explorer:

Pick a folder from your machine.
Browse it as a Finder-style tree.
A detail pane with file metadata — name, size, type, last modified.
For images: dimensions + EXIF, and an image preview.
No server, no network, no persistence — folder access is read-only.

Suggested stack: React + TypeScript + Vite

# Rules for your project
Every feature respects them — and they become material for exercises 6 and 8.

A framework-free core: src/lib/ never imports React (or your UI framework).
No network calls, no localStorage / IndexedDB, no writes.
Styling only through CSS variables in one tokens file.
Your check command — typecheck + lint + tests — stays green.