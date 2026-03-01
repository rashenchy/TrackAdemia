export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-3 mb-8">
        <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
        <div className="h-4 w-1/2 bg-gray-100 dark:bg-gray-800/50 rounded-lg"></div>
      </div>

      {/* Grid / Form Section Skeleton */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-4">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4"></div>
          <div className="h-64 bg-[var(--background)] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm"></div>
        </div>

        {/* Side Content Area */}
        <div className="space-y-4">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4"></div>
          <div className="h-48 bg-[var(--background)] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm"></div>
        </div>
      </div>
    </div>
  )
}