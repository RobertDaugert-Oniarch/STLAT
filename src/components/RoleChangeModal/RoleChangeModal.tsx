import { useState } from "react";
import { useLang } from "../../context/LangContext";
import "./RoleChangeModal.css";

interface RoleChangeModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: (firstName: string, lastName: string) => void;
  onCancel: () => void;
}

const RoleChangeModal = ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: RoleChangeModalProps) => {
  const { t } = useLang();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const canConfirm = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>

        <p className="role-modal-hint">{t.adminNameRequired}</p>

        <div className="role-modal-fields">
          <input
            type="text"
            className="role-modal-input"
            placeholder={t.adminFirstName}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoFocus
          />
          <input
            type="text"
            className="role-modal-input"
            placeholder={t.adminLastName}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div className="confirm-actions">
          <button className="confirm-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className="confirm-btn confirm-btn-primary"
            onClick={() => onConfirm(firstName.trim(), lastName.trim())}
            disabled={!canConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleChangeModal;
