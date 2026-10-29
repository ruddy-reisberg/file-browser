interface Props {
  label: string
  value: string
}

export default function DetailRow({ label, value }: Props) {
  return (
    <div className="detail-pane__row">
      <dt className="detail-pane__label">{label}</dt>
      <dd className="detail-pane__value">{value}</dd>
    </div>
  )
}
