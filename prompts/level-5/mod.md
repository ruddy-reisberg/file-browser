# Create a mod

## File viewer mod 
A slash command of yours opens a pane beside the chat. It shows your project's file tree — folders you can open and close, files with their size. Click a file (or Tab to it and press Enter) and the pane shows its preview: the text, highlighted for its language and with line numbers.

# Rules

- Read-only — the mod never writes, runs a program or touches the network.
- It never shows a file outside the project, and skips .git and node_modules.
- It stays calm on a binary, a huge or an unreadable file — a line saying why, not a crash.
- Everything goes through $ — so claude plugin validate can list it.