import { FiX } from 'react-icons/fi';
import { MODAL_OVERLAY, MODAL, MODAL_WIDE, MODAL_HEADER, MODAL_CLOSE, MODAL_BODY, MODAL_FOOTER } from '../ui/mod';

/**
 * Modal de formulario unificado (mismo estilo que Nuevo Proveedor).
 */
export default function ModFormModal({ open, onClose, title, children, footer, wide = false }) {
    if (!open) return null;

    return (
        <div className={MODAL_OVERLAY} onClick={onClose}>
            <div
                className={`${MODAL} ${wide ? MODAL_WIDE : ''}`}
                onClick={(ev) => ev.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="mod-form-modal-title"
            >
                <div className={MODAL_HEADER}>
                    <h2 id="mod-form-modal-title">{title}</h2>
                    <button type="button" className={MODAL_CLOSE} onClick={onClose} aria-label="Cerrar">
                        <FiX />
                    </button>
                </div>
                <div className={MODAL_BODY}>
                    {children}
                    {footer ? <div className={MODAL_FOOTER}>{footer}</div> : null}
                </div>
            </div>
        </div>
    );
}
