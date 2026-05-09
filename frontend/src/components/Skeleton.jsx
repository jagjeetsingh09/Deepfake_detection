const B = ({ w = 'w-full', h = 'h-3', r = 'rounded-md', extra = '' }) => (
  <div className={`skeleton ${w} ${h} ${r} ${extra}`} />
)

export function SkeletonResultCard() {
  return (
    <div className="card p-6 space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <B w="w-14" h="h-14" r="rounded-2xl" />
          <div className="space-y-2.5">
            <B w="w-20" h="h-2.5" />
            <B w="w-32" h="h-7" r="rounded-lg" />
          </div>
        </div>
        <B w="w-36" h="h-8" r="rounded-full" />
      </div>
      <div className="divider" />
      <div className="space-y-2">
        <div className="flex justify-between"><B w="w-28" h="h-2.5" /><B w="w-12" h="h-2.5" /></div>
        <B h="h-2" r="rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map(i => <div key={i} className="space-y-1.5"><B w="w-24" h="h-2" /><B h="h-1.5" r="rounded-full" /></div>)}
      </div>
      <div className="divider" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="stat-block space-y-2">
            <B w="w-16" h="h-2" /><B w="w-12" h="h-5" r="rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonTimeline() {
  return (
    <div className="card p-5 space-y-4 animate-fade-in">
      <div className="flex justify-between"><B w="w-40" h="h-2.5" /><B w="w-28" h="h-2.5" /></div>
      <B h="h-36" r="rounded-xl" />
      <B w="w-48" h="h-2" />
    </div>
  )
}

export function SkeletonGallery({ n = 10 }) {
  return (
    <div className="card p-5 space-y-4 animate-fade-in">
      <div className="flex justify-between"><B w="w-36" h="h-2.5" /><B w="w-24" h="h-5" r="rounded-full" /></div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: n }).map((_, i) => <B key={i} h="h-0" r="rounded-lg" extra="aspect-video" />)}
      </div>
    </div>
  )
}

export function SkeletonHistory() {
  return (
    <div className="space-y-1 p-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex items-center gap-3 px-2 py-2.5">
          <B w="w-7" h="h-7" r="rounded-lg" />
          <div className="flex-1 space-y-1.5"><B w="w-3/4" h="h-2.5" /><B w="w-1/2" h="h-2" /></div>
          <B w="w-12" h="h-5" r="rounded-full" />
        </div>
      ))}
    </div>
  )
}
