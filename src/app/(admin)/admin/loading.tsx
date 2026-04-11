const summaryCardWidths = ['w-20', 'w-24', 'w-16']

function SkeletonLine({
  width,
  height = 'h-4',
}: {
  width: string
  height?: string
}) {
  return <div className={`${height} ${width} rounded-lg bg-gray-200 dark:bg-gray-800`} />
}

function TableRowSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4 border-b border-gray-100 px-4 py-4 dark:border-gray-800">
      <div className="col-span-3">
        <SkeletonLine width="w-32" />
      </div>
      <div className="col-span-3">
        <SkeletonLine width="w-28" />
      </div>
      <div className="col-span-2">
        <SkeletonLine width="w-20" />
      </div>
      <div className="col-span-2">
        <SkeletonLine width="w-16" />
      </div>
      <div className="col-span-2 flex justify-end">
        <div className="h-8 w-24 rounded-full bg-gray-100 dark:bg-gray-800/60" />
      </div>
    </div>
  )
}

function ListItemSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/30">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <SkeletonLine width="w-36" />
          <SkeletonLine width="w-56" />
          <SkeletonLine width="w-44" height="h-3" />
        </div>
        <div className="h-9 w-24 rounded-full bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  )
}

export default function AdminLoading() {
  return (
    <div className="max-w-7xl animate-pulse space-y-8 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gray-200 dark:bg-gray-800" />

          <div className="space-y-3">
            <SkeletonLine width="w-56" height="h-8" />
            <SkeletonLine width="w-72" />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="h-11 w-28 rounded-xl bg-gray-200 dark:bg-gray-800" />
          <div className="h-11 w-40 rounded-xl bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-11 rounded-xl bg-gray-100 pl-10 dark:bg-gray-800/60" />
            </div>

            <div className="h-11 rounded-xl bg-gray-100 dark:bg-gray-800/60 lg:w-44" />
            <div className="h-11 rounded-xl bg-gray-100 dark:bg-gray-800/60 lg:w-36" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:w-[24rem]">
          {summaryCardWidths.map((valueWidth, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-4 h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
              <div className="space-y-2">
                <SkeletonLine width="w-20" height="h-3" />
                <SkeletonLine width={valueWidth} height="h-6" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="space-y-3">
              <SkeletonLine width="w-48" height="h-6" />
              <SkeletonLine width="w-36" height="h-3" />
            </div>
            <div className="h-9 w-24 rounded-full bg-gray-100 dark:bg-gray-800/60" />
          </div>

          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <ListItemSkeleton key={index} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 space-y-3">
              <SkeletonLine width="w-32" height="h-6" />
              <SkeletonLine width="w-44" height="h-3" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800/60" />
                    <div className="space-y-2">
                      <SkeletonLine width="w-24" height="h-3" />
                      <SkeletonLine width="w-16" height="h-3" />
                    </div>
                  </div>
                  <div className="h-7 w-16 rounded-full bg-gray-100 dark:bg-gray-800/60" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 space-y-3">
              <SkeletonLine width="w-36" height="h-6" />
              <SkeletonLine width="w-40" height="h-3" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/30"
                >
                  <SkeletonLine width="w-14" height="h-3" />
                  <div className="mt-3 h-7 w-16 rounded-lg bg-gray-200 dark:bg-gray-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <SkeletonLine width="w-40" height="h-6" />
            <SkeletonLine width="w-56" height="h-3" />
          </div>
          <div className="h-9 w-28 rounded-full bg-gray-100 dark:bg-gray-800/60" />
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-12 gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="col-span-3">
              <SkeletonLine width="w-20" height="h-3" />
            </div>
            <div className="col-span-3">
              <SkeletonLine width="w-24" height="h-3" />
            </div>
            <div className="col-span-2">
              <SkeletonLine width="w-16" height="h-3" />
            </div>
            <div className="col-span-2">
              <SkeletonLine width="w-14" height="h-3" />
            </div>
            <div className="col-span-2">
              <SkeletonLine width="w-18" height="h-3" />
            </div>
          </div>

          <div>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRowSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
