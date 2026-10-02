import { UpdatePrompt } from './components/UpdatePrompt';

export function App() {
  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <main className="flex-1 px-4 pt-4">
        <h1 className="text-title font-semibold">Palestra</h1>
        <p className="mt-1 text-small text-steel">Diario di allenamento</p>
        <p className="num mt-8 text-timer">1:42</p>
      </main>
      <UpdatePrompt />
    </div>
  );
}
