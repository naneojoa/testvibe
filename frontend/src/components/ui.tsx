import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { useUiStore } from '../stores/ui-store';

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button ${className}`.trim()} {...props} />;
}

interface FieldProps extends PropsWithChildren {
  label: string;
  error?: string;
  hint?: string;
}

export function Field({ label, error, hint, children }: FieldProps) {
  const generatedId = useId();
  const messageId = `${generatedId}-message`;
  const control = isValidElement<{
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }>(children)
    ? cloneElement(children, {
        id: children.props.id ?? generatedId,
        'aria-describedby':
          [children.props['aria-describedby'], error || hint ? messageId : undefined]
            .filter(Boolean)
            .join(' ') || undefined,
        'aria-invalid': error ? true : children.props['aria-invalid'],
      })
    : children;
  return (
    <div className="field">
      <label htmlFor={isValidElement<{ id?: string }>(control) ? control.props.id : undefined}>
        {label}
      </label>
      {control}
      {error ? (
        <small id={messageId} className="field-error">
          {error}
        </small>
      ) : hint ? (
        <small id={messageId}>{hint}</small>
      ) : null}
    </div>
  );
}

export function LoadingState() {
  return <div className="state-card">불러오는 중입니다…</div>;
}

export function EmptyState({ children }: PropsWithChildren) {
  return <div className="state-card">{children}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-card state-error">
      <p>{message}</p>
      {onRetry && <Button onClick={onRetry}>다시 시도</Button>}
    </div>
  );
}

export function ConfirmDialog({
  title,
  children,
  onCancel,
  onConfirm,
  pending = false,
}: PropsWithChildren<{
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
}>) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <h2 id="dialog-title">{title}</h2>
        <div>{children}</div>
        <div className="dialog-actions">
          <Button className="button-plain" onClick={onCancel} disabled={pending}>
            취소
          </Button>
          <Button className="button-danger" onClick={onConfirm} disabled={pending}>
            {pending ? '처리 중…' : '확인'}
          </Button>
        </div>
      </section>
    </div>
  );
}

export function ToastViewport() {
  const toast = useUiStore((state) => state.toast);
  const clearToast = useUiStore((state) => state.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(clearToast, 3500);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  return toast ? (
    <div className={`toast toast-${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
      {toast.message}
    </div>
  ) : null;
}

export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
