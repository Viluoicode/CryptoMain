export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-64 text-center">
      <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center text-2xl mb-4">
        🚧
      </div>
      <h2 className="text-xl font-semibold text-slate-700 mb-2">{title}</h2>
      <p className="text-slate-500 text-sm max-w-xs">
        This page is under construction. Full implementation coming in future phases.
      </p>
    </div>
  );
}
