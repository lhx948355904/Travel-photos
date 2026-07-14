import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";

interface ModalProps {
  title: string;
  visible: boolean;
  footer?: React.ReactNode;
  onOk?: () => void;
  onCancel?: () => void;
  closeOverlay?: boolean;
  children: React.ReactNode;
  type?: "success" | "info" | "warning" | "error";
}

interface ModalConfig {
  id: number;
  title?: string;
  content?: React.ReactNode;
  type?: "success" | "info" | "warning" | "error";
  onOk?: () => void;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

let modalId = 0;
const modals: ModalConfig[] = [];
const listeners: Set<() => void> = new Set();

const notify = () => {
  listeners.forEach((listener) => listener());
};

const addModal = (config: Omit<ModalConfig, "id">): number => {
  const id = ++modalId;
  modals.push({ ...config, id });
  notify();
  return id;
};

const removeModal = (id: number) => {
  const index = modals.findIndex((m) => m.id === id);
  if (index !== -1) {
    modals.splice(index, 1);
    notify();
  }
};

const getModals = (): ModalConfig[] => [...modals];

const createStaticMethod =
  (type: ModalConfig["type"]) =>
  (config: {
    title?: string;
    content?: React.ReactNode;
    onOk?: () => void;
    okText?: string;
  }) => {
    const id = addModal({
      title: config.title,
      content: config.content,
      type,
      onOk: () => {
        removeModal(id);
        config.onOk?.();
      },
      okText: config.okText || "确定",
      showCancel: false,
    });
    return {
      destroy: () => removeModal(id),
    };
  };

const confirm = (config: {
  title?: string;
  content?: React.ReactNode;
  onOk?: () => void;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
}) => {
  const id = addModal({
    title: config.title,
    content: config.content,
    type: "info",
    onOk: () => {
      removeModal(id);
      config.onOk?.();
    },
    onCancel: () => {
      removeModal(id);
      config.onCancel?.();
    },
    okText: config.okText || "确定",
    cancelText: config.cancelText || "取消",
    showCancel: true,
  });
  return {
    destroy: () => removeModal(id),
  };
};

const iconMap = {
  success: (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="modal-icon success"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  info: (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="modal-icon info"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  warning: (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="modal-icon warning"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  error: (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="modal-icon error"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};

const Modal = ({
  title,
  visible,
  footer,
  onOk,
  onCancel,
  closeOverlay = true,
  children,
  type,
}: ModalProps) => {
  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOverlay) {
      onCancel?.();
      return;
    }
  };

  if (!visible) {
    return null;
  }

  return ReactDOM.createPortal(
    <div className="modal-wrapper">
      <div className="modal-overlay" onClick={handleOverlay} />
      <div className="modal-content">
        {title && (
          <div className="modal-header">
            {type && iconMap[type]}
            <span className="modal-title">{title}</span>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer !== null && (
          <div className="modal-footer">
            {footer || (
              <>
                <button
                  className="modal-btn modal-btn-cancel"
                  onClick={onCancel}
                >
                  取消
                </button>
                <button className="modal-btn modal-btn-ok" onClick={onOk}>
                  确定
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

const StaticModal = ({ config }: { config: ModalConfig }) => {
  const handleOk = () => {
    config.onOk?.();
  };

  const handleCancel = () => {
    config.onCancel?.();
  };

  return ReactDOM.createPortal(
    <div className="modal-wrapper">
      <div className="modal-overlay" onClick={handleCancel} />
      <div className="modal-content">
        {config.title && (
          <div className="modal-header">
            {config.type && iconMap[config.type]}
            <span className="modal-title">{config.title}</span>
          </div>
        )}
        <div className="modal-body">{config.content}</div>
        <div className="modal-footer">
          {config.showCancel && (
            <button
              className="modal-btn modal-btn-cancel"
              onClick={handleCancel}
            >
              {config.cancelText}
            </button>
          )}
          <button className="modal-btn modal-btn-ok" onClick={handleOk}>
            {config.okText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export const ModalContainer = () => {
  const [, forceUpdate] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    const listener = () => {
      if (mountedRef.current) {
        forceUpdate((n) => n + 1);
      }
    };
    listeners.add(listener);
    return () => {
      mountedRef.current = false;
      listeners.delete(listener);
    };
  }, []);

  const currentModals = getModals();

  return (
    <>
      {currentModals.map((modal) => (
        <StaticModal key={modal.id} config={modal} />
      ))}
    </>
  );
};

Modal.success = createStaticMethod("success");
Modal.info = createStaticMethod("info");
Modal.warning = createStaticMethod("warning");
Modal.error = createStaticMethod("error");
Modal.confirm = confirm;

export default Modal;
