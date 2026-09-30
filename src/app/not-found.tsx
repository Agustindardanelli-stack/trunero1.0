import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-4 text-center">
      <div>
        <p className="text-5xl font-extrabold text-[var(--brand)]">404</p>
        <p className="mt-2 font-bold">No encontramos esa página</p>
        <Link href="/" className="btn-primary mt-4">Reservar un turno</Link>
      </div>
    </main>
  );
}
