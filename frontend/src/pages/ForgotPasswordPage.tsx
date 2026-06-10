import { useState, type SubmitEvent } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../api/auth";
import { ApiError } from "../api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(email.trim());
      setSuccess(result.message);
    } catch (submitError) {
      const message =
        submitError instanceof ApiError ? submitError.message : "Не удалось отправить запрос";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Восстановление пароля</h1>
        <p className="auth-subtitle">Введите email, указанный при регистрации</p>

        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              required
            />
          </label>

          {error !== null && <p className="form-error">{error}</p>}
          {success !== null && <p className="modal-success">{success}</p>}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            Отправить ссылку
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
