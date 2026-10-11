export default function Loading() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden" aria-hidden="true">
      <div className="loading-progress-bar h-full w-1/3 bg-gradient-to-r from-teal-400 via-amber-400 to-teal-400" />
    </div>
  );
}
