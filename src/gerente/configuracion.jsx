import { useState, useEffect } from 'react';
import {
    FiLock,
    FiDollarSign,
    FiSave,
    FiRefreshCw,
    FiPercent,
    FiEye,
    FiEyeOff,
    FiCheckCircle,
    FiXCircle,
    FiCheck,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as configService from './services/config.service';
import '../assets/css/configuracion.css';
import '../assets/css/modulos.css';

const CONFIG_MENU = [
    { id: 'moneda', label: 'Moneda', icon: FiDollarSign },
    { id: 'clave', label: 'Cambiar Clave', icon: FiLock },
];

export default function Configuracion() {
    const [activeTab, setActiveTab] = useState('moneda');
    const [isLoading, setIsLoading] = useState(true);

    const [exchangeRate, setExchangeRate] = useState(0);
    const [iva, setIva] = useState(0);
    const [currency, setCurrency] = useState('USD');

    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const curr = await configService.getCurrencyConfig();
                setCurrency(curr.currency);
                setExchangeRate(curr.exchangeRate);
                setIva(curr.iva);
            } catch (error) {
                console.error('Error loading config:', error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la configuración.' });
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const preview = (() => {
        const base = 100;
        const subtotal = base * exchangeRate;
        const total = subtotal * (1 + iva / 100);
        return {
            subtotal: subtotal.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            total: total.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
        };
    })();

    const renderMoneda = () => (
        <div className="config-form-container">
            <div className="config-section-header">
                <h2 className="config-section-title">Configuración de Moneda</h2>
                <p className="config-section-desc">
                    Tasa de cambio e IVA. El porcentaje de IVA se aplica automáticamente en las ventas a los
                    productos marcados como «Grava IVA» en inventario.
                </p>
            </div>

            <div className="config-panel-form">
                <div className="mod-form-group">
                    <label>Moneda de referencia</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        <option value="USD">USD — Dólar</option>
                        <option value="EUR">EUR — Euro</option>
                    </select>
                </div>

                <div className="mod-form-group">
                    <label>Tasa de cambio (Bs. por unidad)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                    />
                    <p className="mod-form-hint">Precio o tasa usada para convertir a bolívares.</p>
                </div>

                <div className="mod-form-group">
                    <label>IVA (%)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={iva}
                        onChange={(e) => setIva(parseFloat(e.target.value) || 0)}
                    />
                </div>

                <div className="preview-box">
                    <span>
                        Ejemplo: 100 {currency} = <strong>Bs. {preview.subtotal}</strong>
                    </span>
                    <br />
                    <span className="iva-text">Con IVA ({iva}%): Bs. {preview.total}</span>
                </div>

                <div className="mod-modal-footer" style={{ padding: 0, marginTop: 8 }}>
                    <button
                        type="button"
                        className="btn-mod primary"
                        disabled={isLoading}
                        onClick={async () => {
                            setIsLoading(true);
                            try {
                                await configService.saveCurrencyConfig({ currency, exchangeRate, iva });
                                Swal.fire({
                                    icon: 'success',
                                    title: '¡Guardado!',
                                    text: 'Configuración guardada. Las nuevas ventas usarán este IVA.',
                                    timer: 2000,
                                    showConfirmButton: false,
                                });
                            } catch {
                                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar.' });
                            } finally {
                                setIsLoading(false);
                            }
                        }}
                    >
                        {isLoading ? <FiRefreshCw className="spin" /> : <FiSave />}
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );

    const renderClave = () => (
        <div className="config-form-container">
            <div className="config-section-header">
                <h2 className="config-section-title">Cambiar Contraseña</h2>
                <p className="config-section-desc">Actualiza la clave de acceso de tu usuario.</p>
            </div>

            <div className="config-panel-form">
                <div className="mod-form-group">
                    <label>Contraseña actual</label>
                    <div className="input-with-icon">
                        <input
                            type={showPass.current ? 'text' : 'password'}
                            value={passwords.current}
                            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                            maxLength={64}
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            className="btn-show-pass"
                            onClick={() => setShowPass({ ...showPass, current: !showPass.current })}
                        >
                            {showPass.current ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>
                </div>

                <div className="mod-form-row">
                    <div className="mod-form-group">
                        <label>Nueva contraseña</label>
                        <div className="input-with-icon">
                            <input
                                type={showPass.new ? 'text' : 'password'}
                                value={passwords.new}
                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                maxLength={64}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="btn-show-pass"
                                onClick={() => setShowPass({ ...showPass, new: !showPass.new })}
                            >
                                {showPass.new ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </div>
                    <div className="mod-form-group">
                        <label>Confirmar contraseña</label>
                        <div className="input-with-icon">
                            <input
                                type={showPass.confirm ? 'text' : 'password'}
                                value={passwords.confirm}
                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                maxLength={64}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="btn-show-pass"
                                onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}
                            >
                                {showPass.confirm ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <p className={`password-requirement ${passwords.new.length >= 8 ? 'check' : ''}`}>
                        {passwords.new.length >= 8 ? <FiCheckCircle /> : <FiXCircle />} Mínimo 8 caracteres
                    </p>
                    <p className={`password-requirement ${/[A-Z]/.test(passwords.new) ? 'check' : ''}`}>
                        {/[A-Z]/.test(passwords.new) ? <FiCheckCircle /> : <FiXCircle />} Al menos una mayúscula
                    </p>
                    <p className={`password-requirement ${/[0-9]/.test(passwords.new) ? 'check' : ''}`}>
                        {/[0-9]/.test(passwords.new) ? <FiCheckCircle /> : <FiXCircle />} Al menos un número
                    </p>
                    <p
                        className={`password-requirement ${passwords.new && passwords.new === passwords.confirm ? 'check' : ''}`}
                    >
                        {passwords.new && passwords.new === passwords.confirm ? (
                            <FiCheckCircle />
                        ) : (
                            <FiXCircle />
                        )}{' '}
                        Las contraseñas coinciden
                    </p>
                </div>

                <div className="mod-modal-footer" style={{ padding: 0 }}>
                    <button
                        type="button"
                        className="btn-mod primary"
                        onClick={() => {
                            if (
                                passwords.new.length < 8 ||
                                !/[A-Z]/.test(passwords.new) ||
                                !/[0-9]/.test(passwords.new)
                            ) {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Seguridad insuficiente',
                                    text: 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.',
                                });
                                return;
                            }
                            if (passwords.new !== passwords.confirm) {
                                Swal.fire({ icon: 'error', title: 'Error', text: 'Las contraseñas no coinciden.' });
                                return;
                            }
                            Swal.fire({
                                icon: 'success',
                                title: '¡Actualizada!',
                                text: 'Tu contraseña ha sido cambiada.',
                                timer: 2000,
                                showConfirmButton: false,
                            });
                            setPasswords({ current: '', new: '', confirm: '' });
                        }}
                    >
                        <FiCheck /> Actualizar contraseña
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="config-layout" style={{ position: 'relative' }}>
            {isLoading && (
                <div className="loading-overlay">
                    <FiRefreshCw className="loading-spinner spin" />
                    <p className="loading-text">Cargando configuración…</p>
                </div>
            )}
            <div className="config-sidebar">
                <h3 className="config-sidebar-title">Configuración</h3>
                {CONFIG_MENU.map((item) => (
                    <div
                        key={item.id}
                        className={`config-nav-item ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(item.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setActiveTab(item.id)}
                    >
                        <item.icon className="config-nav-icon" />
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>

            <div className="config-content">{activeTab === 'clave' ? renderClave() : renderMoneda()}</div>
        </div>
    );
}
