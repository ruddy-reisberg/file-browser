import './ListFilter.css'

interface Props {
  query: string
  onQueryChange: (query: string) => void
  /** How many files match, shown once a filter is active. */
  matchCount: number
}

/** Name filter of the list view; shares its query with the 3D sign through App. */
export default function ListFilter({ query, onQueryChange, matchCount }: Props) {
  const active = query.trim() !== ''
  return (
    <div className="list-filter">
      <label className="list-filter__label" htmlFor="list-filter-input">
        Filter by name
      </label>
      <input
        id="list-filter-input"
        className="list-filter__input"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      {active && (
        <p className="list-filter__count" role="status">
          {matchCount} file{matchCount === 1 ? '' : 's'} match
        </p>
      )}
    </div>
  )
}
