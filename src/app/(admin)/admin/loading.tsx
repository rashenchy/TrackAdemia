/* =========================================
   SKELETON STYLE CONFIG
   - Defines gradient + border styles
   - Used for loading metric cards
========================================= */
const metricSkeletons = [
  'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800',
  'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/10 border-yellow-200 dark:border-yellow-800',
  'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 border-green-200 dark:border-green-800',
  'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800',
]

/* =========================================
   ADMIN LOADING COMPONENT
   - Displays skeleton UI while data loads
   - Mimics actual dashboard layout
========================================= */
export default function AdminLoading() {

  return (
    <div className="max-w-7xl space-y-8 pb-8 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="space-y-3">
          <div className="h-8 w-72 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-64 rounded-lg bg-gray-100 dark:bg-gray-800/50" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricSkeletons.map((cardClassName, index) => (
          <div
            key={index}
            className={`rounded-2xl border bg-gradient-to-br p-6 ${cardClassName}`}
          >
            <div className="mb-6 flex items-start justify-between">
              <div className="h-11 w-11 rounded-lg bg-white/60 dark:bg-gray-800/60" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-24 rounded-lg bg-white/70 dark:bg-gray-800/60" />
              <div className="h-9 w-20 rounded-lg bg-white/80 dark:bg-gray-700/70" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6 h-6 w-44 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="flex h-[300px] items-end gap-4 rounded-xl bg-gray-50 px-4 pb-5 pt-8 dark:bg-gray-800/30">
            <div className="h-28 flex-1 rounded-t-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-40 flex-1 rounded-t-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-20 flex-1 rounded-t-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-52 flex-1 rounded-t-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-32 flex-1 rounded-t-xl bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6 h-6 w-52 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="flex h-[250px] items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800/30">
            <div className="h-40 w-40 rounded-full border-[18px] border-gray-200 border-t-gray-300 dark:border-gray-700 dark:border-t-gray-500" />
          </div>
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 w-24 rounded-lg bg-gray-200 dark:bg-gray-800" />
                </div>
                <div className="h-4 w-16 rounded-lg bg-gray-100 dark:bg-gray-800/60" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 h-6 w-56 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-6 gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-4 rounded-lg bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-6 gap-4 border-b border-gray-100 px-4 py-4 dark:border-gray-800"
              >
                <div className="flex items-center">
                  <div className="h-6 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="col-span-2 h-4 rounded-lg bg-gray-200 dark:bg-gray-800" />
                <div className="h-4 rounded-lg bg-gray-100 dark:bg-gray-800/60" />
                <div className="h-8 rounded-full bg-blue-50 dark:bg-blue-900/20" />
                <div className="h-8 rounded-full bg-green-50 dark:bg-green-900/20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
