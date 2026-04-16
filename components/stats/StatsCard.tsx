import styles from './StatsCard.module.css'

interface StatsCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'red' | 'blue' | 'gold'
  icon?: React.ReactNode
}

export default function StatsCard({ label, value, sub, accent = 'red', icon }: StatsCardProps) {
  return (
    <div className={styles.card}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={`${styles.value} ${styles[accent]}`}>{value}</div>
      <div className={styles.label}>{label}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  )
}
