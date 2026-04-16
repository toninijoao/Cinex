import styles from './FilterPill.module.css'

type PillColor = 'red' | 'blue' | 'neutral'

interface FilterPillProps {
  label: string
  active?: boolean
  color?: PillColor
  onClick?: () => void
  id?: string
}

export default function FilterPill({
  label,
  active = false,
  color = 'red',
  onClick,
  id,
}: FilterPillProps) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={[
        styles.pill,
        active ? styles.active : '',
        active ? styles[color] : '',
      ].filter(Boolean).join(' ')}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}
