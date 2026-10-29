import { Suspense, lazy, useMemo, useState } from 'react'
import { buildTree } from './lib/tree'
import { countFiles, filterTree } from './lib/filter'
import { supportsWebGL } from './lib/webgl'
import type { FileEntry, TreeNode } from './lib/types'
import FolderPicker from './components/FolderPicker'
import Tree from './components/Tree'
import ListFilter from './components/ListFilter'
import DetailPane from './components/DetailPane'
import SceneErrorBoundary from './components/SceneErrorBoundary'
import './App.css'

// three.js is large and only the 3D view needs it: load it on demand.
const SceneView = lazy(() => import('./components/scene/SceneView'))

type ViewMode = 'scene' | 'list'

/** Shown before any folder is picked: an empty island waiting for trees. */
const EMPTY_ROOT: TreeNode = { name: '', kind: 'dir', path: '', children: [] }

export default function App() {
  const [root, setRoot] = useState<TreeNode | null>(null)
  const [selected, setSelected] = useState<TreeNode | null>(null)
  // Owned here so the list view and the 3D sign filter the same tree.
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [webglAvailable] = useState(supportsWebGL)
  const [viewMode, setViewMode] = useState<ViewMode>(webglAvailable ? 'scene' : 'list')
  // Bumped on every pick so the 3D view starts over on a freshly chosen folder.
  const [pickCount, setPickCount] = useState(0)

  function handlePicked(rootName: string, entries: FileEntry[]) {
    setError(null)
    const tree = buildTree(rootName, entries)
    setRoot(tree)
    setSelected(null)
    setQuery('')
    setPickCount((count) => count + 1)
  }

  const visibleRoot = useMemo(() => (root ? filterTree(root, query) : null), [root, query])
  const matchCount = useMemo(
    () => (visibleRoot && query.trim() !== '' ? countFiles(visibleRoot) : 0),
    [visibleRoot, query],
  )

  function handleSceneFailure(message: string) {
    setError(`The 3D view is unavailable (${message}). Showing the list view instead.`)
    setViewMode('list')
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">File Browser</h1>
        <div className="app__actions">
          <div className="app__views" role="group" aria-label="View">
            <button
              type="button"
              className="app__view-button"
              aria-pressed={viewMode === 'scene'}
              disabled={!webglAvailable}
              title={webglAvailable ? undefined : 'WebGL is not available in this browser'}
              onClick={() => setViewMode('scene')}
            >
              3D
            </button>
            <button
              type="button"
              className="app__view-button"
              aria-pressed={viewMode === 'list'}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
          <FolderPicker onPicked={handlePicked} onError={setError} />
        </div>
      </header>

      {error && <p className="app__error">{error}</p>}

      {viewMode === 'scene' ? (
        <main className="app__main">
          <section className="app__scene" aria-label="3D folder view">
            <SceneErrorBoundary onError={handleSceneFailure}>
              <Suspense fallback={<p className="app__placeholder">Growing the island…</p>}>
                <SceneView
                  key={pickCount}
                  root={root ?? EMPTY_ROOT}
                  onSelect={setSelected}
                  selected={selected}
                  query={query}
                  onQueryChange={setQuery}
                  emptyMessage={root ? undefined : 'Choose a folder to grow your first trees.'}
                />
              </Suspense>
            </SceneErrorBoundary>
          </section>
        </main>
      ) : (
        <main className="app__main">
          <section className="app__tree" aria-label="Folder tree">
            {root && visibleRoot ? (
              <>
                <ListFilter query={query} onQueryChange={setQuery} matchCount={matchCount} />
                {(visibleRoot.children?.length ?? 0) === 0 && query.trim() !== '' ? (
                  <p className="app__placeholder">No file or folder matches this filter.</p>
                ) : (
                  <Tree root={visibleRoot} selectedPath={selected?.path ?? null} onSelect={setSelected} />
                )}
              </>
            ) : (
              <p className="app__placeholder">No folder chosen yet.</p>
            )}
          </section>
          <section className="app__detail" aria-label="File details">
            <DetailPane node={selected} />
          </section>
        </main>
      )}
    </div>
  )
}
