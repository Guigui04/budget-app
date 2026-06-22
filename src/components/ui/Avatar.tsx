interface AvatarProps {
  name: string
  color: string
  size?: number
}

export function Avatar({ name, color, size = 36 }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
      title={name}
    >
      {initials}
    </span>
  )
}
