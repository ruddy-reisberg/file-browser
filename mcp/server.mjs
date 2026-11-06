// Read-only stdio MCP server about this project. Node-only: it is not part of the
// browser bundle and never writes. stdout is the protocol channel, so log to stderr only.
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LIB_DIR = join(ROOT, 'src', 'lib')

// Setting from the environment (see .mcp.json); falls back to 200 when unset or invalid.
const parsed = Number.parseInt(process.env.FILE_BROWSER_MAX_LINES ?? '', 10)
const MAX_LINES = Number.isInteger(parsed) && parsed > 0 ? parsed : 200

/** Module names in src/lib (no tests, no .d.ts), e.g. "tree", "filter". */
async function listLibModules() {
  const entries = await readdir(LIB_DIR, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts'))
    .map((e) => e.name.slice(0, -'.ts'.length))
    .sort()
}

const text = (t, isError = false) => ({ content: [{ type: 'text', text: t }], isError })

const server = new McpServer({ name: 'file-browser', version: '1.0.0' })

// Tool: the model decides when to call it.
server.registerTool(
  'read_lib_module',
  {
    title: 'Read a src/lib module',
    description:
      'Return the source of one framework-free module of src/lib (e.g. "tree", "filter"), ' +
      `truncated to ${MAX_LINES} lines. Read-only.`,
    inputSchema: { name: z.string().describe('Module name without extension, e.g. "tree"') },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ name }) => {
    const modules = await listLibModules()
    // Allowlist match: the input is never used to build a path directly (no traversal).
    if (!modules.includes(name)) {
      return text(`Unknown module "${name}". Available: ${modules.join(', ')}`, true)
    }
    const lines = (await readFile(join(LIB_DIR, `${name}.ts`), 'utf8')).split(/\r?\n/)
    const shown = lines.slice(0, MAX_LINES).join('\n')
    const note =
      lines.length > MAX_LINES ? `\n// … truncated: ${lines.length - MAX_LINES} more lines` : ''
    return text(shown + note)
  },
)

// Resource: attached by the user with @file-browser:project://rules.
server.registerResource(
  'project-rules',
  'project://rules',
  {
    title: 'Project rules',
    description: 'The project CLAUDE.md: forbidden list, conventions, architecture, commands.',
    mimeType: 'text/markdown',
  },
  async (uri) => ({
    contents: [
      { uri: uri.href, mimeType: 'text/markdown', text: await readFile(join(ROOT, 'CLAUDE.md'), 'utf8') },
    ],
  }),
)

// Prompt: becomes the slash command /mcp__file-browser__review_lib_module.
server.registerPrompt(
  'review_lib_module',
  {
    title: 'Review a src/lib module',
    description: 'Review one src/lib module against the project rules.',
    argsSchema: { name: z.string().describe('Module name, e.g. "tree"') },
  },
  ({ name }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text:
            `Read the src/lib/${name}.ts module (tool read_lib_module) and the project rules ` +
            '(resource project://rules). Report any violation of the src/lib rules ' +
            '(purity, no React, no network/storage/writes, typed errors) and any missing test ' +
            `case in src/lib/__tests__/${name}.test.ts. Read-only: do not edit anything.`,
        },
      },
    ],
  }),
)

await server.connect(new StdioServerTransport())
console.error(`file-browser MCP ready (max lines: ${MAX_LINES})`)
