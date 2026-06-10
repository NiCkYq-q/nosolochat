import { useState, type SubmitEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth";
import { ApiError } from "../api/client";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (token === "") {
      setError("Ссылка для сброса пароля недействительна");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(token, newPassword);
      void navigate("/login", { replace: true });
    } catch (submitError) {
      const message =
        submitError instanceof ApiError ? submitError.message : "Не удалось сменить пароль";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Новый пароль</h1>
        <p className="auth-subtitle">Придумайте новый пароль для входа</p>

        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field">
            <span>Новый пароль</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
              }}
              required
              minLength={6}
            />
          </label>

          <label className="field">
            <span>Повторите пароль</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
              }}
              required
              minLength={6}
            />
          </label>

          {error !== null && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            Сохранить пароль
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/login" className="link-button">
            ← Вернуться ко входу
          </Link>
        </p>
      </section>
    </main>
  );
}
