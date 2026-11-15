import { Folder, Link2 } from 'lucide-react'

export function CoverBadge({ kind }: { kind: 'folder' | 'linked' }) {
  const label = kind === 'folder' ? '文件夹' : 'B站关联收藏夹'
  return <span className={`cover-badge cover-badge-${kind}`} title={label} aria-label={label}>{kind === 'folder' ? <Folder aria-hidden="true"/> : <Link2 aria-hidden="true"/>}</span>
}
