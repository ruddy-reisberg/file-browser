import { useState } from 'react'
import { buildTree } from './lib/tree'
import type { FileEntry, TreeNode } from './lib/types'
import FolderPicker from './components/FolderPicker'
import Tree from './components/Tree'
import DetailPane from './components/DetailPane'
import './App.css'

export default function App() {
  const [root, setRoot] = useState<TreeNode | null>(null)
  const [selected, setSelected] = useState<TreeNode | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handlePicked(rootName: string, entries: FileEntry[]) {
    setError(null)
    const tree = buildTree(rootName, entries)
    setRoot(tree)
    setSelected(null)
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">File Browser</h1>
        <FolderPicker onPicked={handlePicked} onError={setError} />
      </header>

      {error && <p className="app__error">{error}</p>}

      <main className="app__main">
        <section className="app__tree" aria-label="Folder tree">
          {root ? (
            <Tree root={root} selectedPath={selected?.path ?? null} onSelect={setSelected} />
          ) : (
            <p className="app__placeholder">No folder chosen yet.</p>
          )}
        </section>
        <section className="app__detail" aria-label="File details">
          <DetailPane node={selected} />
        </section>
      </main>
    </div>
  )
}
