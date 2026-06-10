import { useState, type SubmitEvent } from "react";
import { ApiError } from "../api/client";
import { deleteOwnAccount } from "../api/account";

type DeleteAccountModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
};

export default function DeleteAccountModal({ isOpen, onClose, onDeleted }: DeleteAccountModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await deleteOwnAccount(password);
      onDeleted();
    } catch (submitError) {
      const message =
        submitError instanceof ApiError ? submitError.message : "Не удалось удалить аккаунт";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setError(null);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <section
        className="modal-card confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="modal-header">
          <h2 id="delete-account-title">Удалить аккаунт</h2>
        </header>
        <p className="confirm-message">
          Это действие необратимо. Все ваши данные будут удалены. Введите пароль для подтверждения.
        </p>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <label className="field">
            <span>Пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              required
            />
          </label>
          {error !== null && <p className="form-error">{error}</p>}
          <div className="confirm-actions">
            <button type="button" className="secondary-button" onClick={handleClose}>
              Отмена
            </button>
            <button
              type="submit"
              className="primary-button confirm-danger"
              disabled={isSubmitting || password === ""}
            >
              Удалить аккаунт
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
