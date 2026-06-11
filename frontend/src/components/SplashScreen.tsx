export default function SplashScreen() {
  return (
    <div className="app-splash" role="status" aria-live="polite" aria-label="Загрузка приложения">
      <h1 className="app-splash-logo">NoSoloChat</h1>
      <div className="app-splash-spinner" aria-hidden="true" />
    </div>
  );
}
