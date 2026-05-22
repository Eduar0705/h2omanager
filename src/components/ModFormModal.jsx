import { FiX } from 'react-icons/fi';
import '../assets/css/modulos.css';

/**
 * Modal de formulario unificado (mismo estilo que Nuevo Proveedor).
 */
export default function ModFormModal({ open, onClose, title, children, footer, wide = false }) {
    if (!open) return null;

    return (
        <div className="mod-modal-overlay" onClick={onClose}>
            <div
                className={`mod-modal ${wide ? 'mod-modal-wide' : ''}`}
                onClick={(ev) => ev.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="mod-form-modal-title"
            >
                <div className="mod-modal-header">
                    <h2 id="mod-form-modal-title">{title}</h2>
                    <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar">
                        <FiX />
                    </button>
                </div>
                <div className="mod-modal-body">
                    {children}
                    {footer ? <div className="mod-modal-footer">{footer}</div> : null}
                </div>
            </div>
        </div>
    );
}
