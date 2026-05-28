export default function AdminDashboardLoading() {
  return (
    <div className="w-full max-w-container-max mx-auto py-10 px-4 md:px-margin-desktop space-y-10">
      {/* Top Header Placeholder */}
      <header className="space-y-3">
        <div className="h-9 w-64 rounded shimmer-skeleton"></div>
        <div className="h-4.5 w-96 rounded shimmer-skeleton"></div>
      </header>

      {/* Metrics Row Skeleton */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[1, 2, 3].map((index) => (
          <div
            key={index}
            className="border border-outline-variant/20 rounded-xl p-6 space-y-4 shimmer-skeleton"
          >
            <div className="flex justify-between items-center">
              <div className="h-4.5 w-24 bg-white/5 rounded"></div>
              <div className="w-8 h-8 bg-white/5 rounded-full"></div>
            </div>
            <div className="h-8 w-20 bg-white/5 rounded"></div>
            <div className="h-3.5 w-32 bg-white/5 rounded"></div>
          </div>
        ))}
      </section>

      {/* Tab Controls and Actions Skeleton */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/10 pb-4">
        {/* Horizontal tabs */}
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded shimmer-skeleton"></div>
          <div className="h-9 w-24 rounded shimmer-skeleton"></div>
        </div>
        {/* Search Input Box */}
        <div className="h-9 w-full sm:w-64 rounded-lg shimmer-skeleton"></div>
      </section>

      {/* Rows Table Placeholder */}
      <section className="space-y-4">
        {[1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className="border border-outline-variant/10 rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4 shimmer-skeleton"
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-white/5 flex-shrink-0"></div>
              <div className="space-y-2 flex-grow min-w-0">
                <div className="h-4.5 w-2/5 bg-white/5 rounded"></div>
                <div className="h-3.5 w-1/4 bg-white/5 rounded"></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-16 bg-white/5 rounded-full"></div>
              <div className="h-8 w-8 bg-white/5 rounded-full"></div>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
