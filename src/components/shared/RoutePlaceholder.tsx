export function RoutePlaceholder({ id, name, owner }: { id: string; name: string; owner: string }) {
  return (
    <main className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <span className="font-mono text-label text-muted-foreground">
        {id} · {owner}
      </span>
      <h1 className="text-title">{name}</h1>
    </main>
  );
}
