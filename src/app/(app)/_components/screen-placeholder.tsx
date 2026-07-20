// Placeholder used by the Week 3 empty screen scaffolds. Each real screen replaces this with its
// actual UI in the milestone noted.
export function ScreenPlaceholder({ title, milestone }: { title: string; milestone: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
        {title}
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Placeholder scaffold. Built in {milestone}.
      </p>
    </div>
  );
}
