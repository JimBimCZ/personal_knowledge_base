export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Personal knowledge base</h1>
      <p className="mt-3 text-slate-600">
        Ask questions of your own notes. Every answer cites the document it came
        from.
      </p>
      <p className="mt-8 text-sm text-slate-500">
        Sign-in and search arrive in the next slices. Service status is at{" "}
        <a className="underline" href="/api/health">
          /api/health
        </a>
        .
      </p>
    </main>
  );
}
