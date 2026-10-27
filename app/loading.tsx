export default function Loading() {
  return (
    <main className="loading-page" aria-busy="true" aria-label="Cargando Vigente">
      <div className="skeleton skeleton-brand" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-panel" />
    </main>
  );
}
