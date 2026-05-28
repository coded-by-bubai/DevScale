export default function ListingsLoading() {
  return (
    <div className="w-full">
      {/* Hero Section Skeleton */}
      <section className="py-12 md:py-20 flex flex-col items-center text-center space-y-6">
        <div className="h-10 sm:h-12 w-full max-w-lg rounded shimmer-skeleton"></div>
        <div className="space-y-2.5 w-full max-w-md">
          <div className="h-4 w-full rounded shimmer-skeleton"></div>
          <div className="h-4 w-5/6 mx-auto rounded shimmer-skeleton"></div>
        </div>
        <div className="flex gap-4 pt-4">
          <div className="h-12 w-32 rounded shimmer-skeleton"></div>
          <div className="h-12 w-32 rounded border border-outline-variant/10 shimmer-skeleton"></div>
        </div>
      </section>

      {/* Featured Article Card Skeleton */}
      <section className="mb-section-gap">
        <div className="border border-outline-variant/20 rounded-xl overflow-hidden shimmer-skeleton relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 h-full">
            {/* Cover Image Placeholder */}
            <div className="h-64 md:h-80 w-full bg-white/5"></div>
            {/* Content Details Placeholder */}
            <div className="p-6 md:p-12 flex flex-col justify-center space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-6 w-20 bg-white/5 rounded"></div>
                <div className="h-4 w-24 bg-white/5 rounded"></div>
              </div>
              <div className="h-8 w-full bg-white/5 rounded"></div>
              <div className="h-8 w-5/6 bg-white/5 rounded"></div>
              <div className="space-y-2 pt-2">
                <div className="h-3.5 w-full bg-white/5 rounded"></div>
                <div className="h-3.5 w-11/12 bg-white/5 rounded"></div>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <div className="w-10 h-10 rounded-full bg-white/5"></div>
                <div className="space-y-1.5 flex-grow">
                  <div className="h-3.5 w-24 bg-white/5 rounded"></div>
                  <div className="h-3 w-16 bg-white/5 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Articles Grid/Scroll list Skeletons */}
      <section className="mb-section-gap">
        <div className="flex justify-between items-end mb-8">
          <div className="h-8 w-44 rounded shimmer-skeleton"></div>
          <div className="h-4 w-20 rounded shimmer-skeleton"></div>
        </div>

        <div className="flex overflow-x-auto gap-6 pb-6 hide-scrollbar">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className="border border-outline-variant/20 rounded-lg p-6 min-w-[270px] w-[270px] sm:min-w-[320px] sm:w-[320px] md:min-w-[350px] md:w-[350px] flex flex-col min-h-[280px] h-auto space-y-4 shimmer-skeleton"
            >
              <div className="flex justify-between items-start">
                <div className="h-5 w-16 bg-white/5 rounded"></div>
                <div className="h-4 w-12 bg-white/5 rounded"></div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-6 w-full bg-white/5 rounded"></div>
                <div className="h-6 w-3/4 bg-white/5 rounded"></div>
              </div>
              <div className="space-y-2 pt-2 flex-grow">
                <div className="h-3.5 w-full bg-white/5 rounded"></div>
                <div className="h-3.5 w-11/12 bg-white/5 rounded"></div>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <div className="w-4 h-4 bg-white/5 rounded-full"></div>
                <div className="h-3.5 w-24 bg-white/5 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
