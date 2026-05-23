import { useState, useEffect } from 'react';
import {
    FiLock,
    FiDollarSign,
    FiSave,
    FiRefreshCw,
    FiEye,
    FiEyeOff,
    FiCheckCircle,
    FiXCircle,
    FiCheck,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as configService from './services/config.service';
import { PANEL_FORM, PREVIEW_BOX, INPUT_ICON, BTN_SHOW_PASS, FORM_GROUP, FORM_ROW, FORM_HINT, MODAL_FOOTER, BTN_MOD_PRIMARY } from '../ui/mod';

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
        <div>
            <div className="mb-8 border-b border-border pb-4">
                <h2 className="font-display text-xl font-extrabold text-text max-[600px]:text-lg">Configuración de Moneda</h2>
                <p className="mt-1.5 text-sm text-muted">
                    Tasa de cambio e IVA. El porcentaje de IVA se aplica automáticamente en las ventas a los
                    productos marcados como «Grava IVA» en inventario.
                </p>
            </div>

            <div className={PANEL_FORM}>
                <div className={FORM_GROUP}>
                    <label>Moneda de referencia</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        <option value="USD">USD — Dólar</option>
                        <option value="EUR">EUR — Euro</option>
                    </select>
                </div>

                <div className={FORM_GROUP}>
                    <label>Tasa de cambio (Bs. por unidad)</label>
                    <input type="number" step="0.01" min="0" value={exchangeRate} onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)} />
                    <p className={FORM_HINT}>Precio o tasa usada para convertir a bolívares.</p>
                </div>

                <div className={FORM_GROUP}>
                    <label>IVA (%)</label>
                    <input type="number" step="0.01" min="0" value={iva} onChange={(e) => setIva(parseFloat(e.target.value) || 0)} />
                </div>

                <div className={PREVIEW_BOX}>
                    <span>
                        Ejemplo: 100 {currency} = <strong className="mx-1.5 text-lg text-accent">Bs. {preview.subtotal}</strong>
                    </span>
                    <br />
                    <span className="text-[13px]">Con IVA ({iva}%): Bs. {preview.total}</span>
                </div>

                <div className={`${MODAL_FOOTER} mt-2 !p-0`}>
                    <button
                        type="button"
                        className={BTN_MOD_PRIMARY}
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
                        {isLoading ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );

    const reqCls = (ok) => `flex items-center gap-1.5 text-xs ${ok ? 'text-[#10b981]' : 'text-muted'}`;

    const renderClave = () => (
        <div>
            <div className="mb-8 border-b border-border pb-4">
                <h2 className="font-display text-xl font-extrabold text-text max-[600px]:text-lg">Cambiar Contraseña</h2>
                <p className="mt-1.5 text-sm text-muted">Actualiza la clave de acceso de tu usuario.</p>
            </div>

            <div className={PANEL_FORM}>
                <div className={FORM_GROUP}>
                    <label>Contraseña actual</label>
                    <div className={INPUT_ICON}>
                        <input
                            type={showPass.current ? 'text' : 'password'}
                            value={passwords.current}
                            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                            maxLength={64}
                            autoComplete="current-password"
                        />
                        <button type="button" className={BTN_SHOW_PASS} onClick={() => setShowPass({ ...showPass, current: !showPass.current })}>
                            {showPass.current ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>
                </div>

                <div className={FORM_ROW}>
                    <div className={FORM_GROUP}>
                        <label>Nueva contraseña</label>
                        <div className={INPUT_ICON}>
                            <input
                                type={showPass.new ? 'text' : 'password'}
                                value={passwords.new}
                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                maxLength={64}
                                autoComplete="new-password"
                            />
                            <button type="button" className={BTN_SHOW_PASS} onClick={() => setShowPass({ ...showPass, new: !showPass.new })}>
                                {showPass.new ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </div>
                    <div className={FORM_GROUP}>
                        <label>Confirmar contraseña</label>
                        <div className={INPUT_ICON}>
                            <input
                                type={showPass.confirm ? 'text' : 'password'}
                                value={passwords.confirm}
                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                maxLength={64}
                                autoComplete="new-password"
                            />
                            <button type="button" className={BTN_SHOW_PASS} onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}>
                                {showPass.confirm ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <p className={reqCls(passwords.new.length >= 8)}>
                        {passwords.new.length >= 8 ? <FiCheckCircle /> : <FiXCircle />} Mínimo 8 caracteres
                    </p>
                    <p className={reqCls(/[A-Z]/.test(passwords.new))}>
                        {/[A-Z]/.test(passwords.new) ? <FiCheckCircle /> : <FiXCircle />} Al menos una mayúscula
                    </p>
                    <p className={reqCls(/[0-9]/.test(passwords.new))}>
                        {/[0-9]/.test(passwords.new) ? <FiCheckCircle /> : <FiXCircle />} Al menos un número
                    </p>
                    <p className={reqCls(passwords.new && passwords.new === passwords.confirm)}>
                        {passwords.new && passwords.new === passwords.confirm ? <FiCheckCircle /> : <FiXCircle />} Las contraseñas coinciden
                    </p>
                </div>

                <div className={`${MODAL_FOOTER} !p-0`}>
                    <button
                        type="button"
                        className={BTN_MOD_PRIMARY}
                        onClick={() => {
                            if (passwords.new.length < 8 || !/[A-Z]/.test(passwords.new) || !/[0-9]/.test(passwords.new)) {
                                Swal.fire({ icon: 'error', title: 'Seguridad insuficiente', text: 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.' });
                                return;
                            }
                            if (passwords.new !== passwords.confirm) {
                                Swal.fire({ icon: 'error', title: 'Error', text: 'Las contraseñas no coinciden.' });
                                return;
                            }
                            Swal.fire({ icon: 'success', title: '¡Actualizada!', text: 'Tu contraseña ha sido cambiada.', timer: 2000, showConfirmButton: false });
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
        <div className="relative grid min-h-[calc(100vh-100px)] grid-cols-[280px_1fr] gap-6 p-6 max-[1024px]:grid-cols-[240px_1fr] max-[900px]:grid-cols-1">
            {isLoading && (
                <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center rounded-[20px] bg-white/70 backdrop-blur-[2px]">
                    <FiRefreshCw className="mb-3 animate-spin text-[40px] text-accent" />
                    <p className="text-[15px] font-semibold text-text">Cargando configuración…</p>
                </div>
            )}
            <div className="flex h-fit flex-col gap-2 rounded-2xl border border-border bg-surface px-4 py-6 shadow-brand max-[900px]:flex-row max-[900px]:overflow-x-auto max-[900px]:p-4">
                <h3 className="mb-4 px-3 font-display text-lg font-extrabold text-text max-[900px]:hidden">Configuración</h3>
                {CONFIG_MENU.map((item) => (
                    <div
                        key={item.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition max-[900px]:flex-[0_0_auto] ${
                            activeTab === item.id
                                ? 'border-accent/20 bg-accent/[0.08] font-semibold text-accent'
                                : 'border-transparent text-muted hover:bg-bg hover:text-accent'
                        }`}
                        onClick={() => setActiveTab(item.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setActiveTab(item.id)}
                    >
                        <item.icon className="text-lg" />
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-border bg-surface p-8 shadow-brand max-[600px]:px-4 max-[600px]:py-6">
                {activeTab === 'clave' ? renderClave() : renderMoneda()}
            </div>
        </div>
    );
}
