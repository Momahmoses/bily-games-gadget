export default function ProductSkeleton() {
  return (
    <section className="py-14">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded-lg skeleton" />
          <div className="h-5 w-20 bg-gray-200 rounded skeleton" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
              <div className="pt-[100%] bg-gray-100 skeleton" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-gray-200 rounded skeleton w-2/3" />
                <div className="h-4 bg-gray-200 rounded skeleton" />
                <div className="h-4 bg-gray-200 rounded skeleton w-3/4" />
                <div className="h-6 bg-gray-200 rounded skeleton w-1/2" />
                <div className="h-9 bg-gray-200 rounded-xl skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
