export function Logo({ width = 24, height = 24 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Abstract A / Pyramid structure */}
      <rect x="10" y="2" width="4" height="4" fill="var(--ink)" />
      
      <rect x="6" y="8" width="4" height="4" fill="var(--ink)" />
      <rect x="14" y="8" width="4" height="4" fill="var(--ink)" />
      
      <rect x="2" y="14" width="4" height="4" fill="var(--ink)" />
      <rect x="8" y="14" width="8" height="4" fill="var(--ink)" />
      <rect x="18" y="14" width="4" height="4" fill="var(--ink)" />
      
      <rect x="2" y="20" width="4" height="4" fill="var(--rec-red)" />
      <rect x="18" y="20" width="4" height="4" fill="var(--ink)" />
    </svg>
  )
}
