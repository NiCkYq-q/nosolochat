import { useState } from "react";

type AdminDeleteUserDialogProps = {
  isOpen: boolean;
  username: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function AdminDeleteUserDialog({
  isOpen,
  username,
  onCancel,
  onConfirm,
}: AdminDeleteUserDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmation, setConfirmation] = useState("");

  if (!isOpen) {
    return null;
  }

  const handleCancel = () => {
    setStep(1);
    setConfirmation("");
    onCancel();
  };

  const canConfirm = confirmation === username;

  return (
    <div className="modal-backdrop" onClick={handleCancel}>
      <section
        className="modal-card confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-delete-title"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="modal-header">
          <h2 id="admin-delete-title">Удалить пользователя</h2>
        </header>

        {step === 1 ? (
          <>
            <p className="confirm-message">
              Вы уверены, что хотите удалить пользователя <strong>{username}</strong>? Все его данные
              будут удалены безвозвратно.
            </p>
            <div className="confirm-actions">
              <button type="button" className="secondary-button" onClick={handleCancel}>
                Отмена
              </button>
              <button
                type="button"
                className="primary-button confirm-danger"
                onClick={() => {
                  setStep(2);
                }}
              >
                Продолжить
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="confirm-message">
              Для подтверждения введите имя пользователя: <strong>{username}</strong>
            </p>
            <label className="field">
              <span>Имя пользователя</span>
              <input
                type="text"
                value={confirmation}
                autoComplete="off"
                onChange={(event) => {
                  setConfirmation(event.target.value);
                }}
              />
            </label>
            <div className="confirm-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setStep(1);
                  setConfirmation("");
                }}
              >
                Назад
              </button>
              <button
                type="button"
                className="primary-button confirm-danger"
                disabled={!canConfirm}
                onClick={() => {
                  setStep(1);
                  setConfirmation("");
                  onConfirm();
                }}
              >
                Удалить
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
