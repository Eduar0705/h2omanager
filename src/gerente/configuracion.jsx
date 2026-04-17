import { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiLock, 
  FiSettings, 
  FiDollarSign, 
  FiDroplet, 
  FiSave,
  FiRefreshCw,
  FiPercent,
  FiPlus,
  FiTruck,
  FiPackage,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiEdit2,
  FiUserPlus,
  FiBriefcase,
  FiMapPin,
  FiPhone,
  FiMail,
  FiEye,
  FiEyeOff,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as configService from './services/config.service';

const escHtml = (t) =>
    String(t)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
import '../assets/css/configuracion.css';

const CONFIG_MENU = [
  { id: 'usuarios', label: 'Usuarios', icon: FiUsers },
  { id: 'moneda', label: 'Moneda', icon: FiDollarSign },
  { id: 'clave', label: 'Cambiar Clave', icon: FiLock },
  { id: 'precios', label: 'Precios por Litro', icon: FiDroplet },
  { id: 'general', label: 'General', icon: FiSettings },
];

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState('moneda');
  
  // Moneda
  const [exchangeRate, setExchangeRate] = useState(0);
  const [iva, setIva] = useState(0);
  const [currency, setCurrency] = useState('USD');

  // Precios y Botellones
  const [waterPrice, setWaterPrice] = useState(0);
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [bottles, setBottles] = useState([]);

  // Usuarios
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPageUsers] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Cambio de Clave
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });

  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    rif: '',
    address: '',
    phone: '',
    email: ''
  });

  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos al iniciar
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Cargar todo en paralelo para mejor rendimiento
        const [general, curr, pricing, userList] = await Promise.all([
          configService.getGeneralConfig(),
          configService.getCurrencyConfig(),
          configService.getPricingConfig(),
          configService.getUsers()
        ]);

        setCompanyInfo(general);
        setCurrency(curr.currency);
        setExchangeRate(curr.exchangeRate);
        setIva(curr.iva);
        setWaterPrice(pricing.waterPrice);
        setDeliveryPrice(pricing.deliveryPrice);
        setBottles(pricing.bottles);
        setUsers(userList);
      } catch (error) {
        console.error('Error loading config:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los datos.' });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const calculatePreview = () => {
    const base = 100;
    const subtotal = base * exchangeRate;
    const total = subtotal * (1 + iva / 100);
    return {
      subtotal: subtotal.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
      total: total.toLocaleString('es-VE', { minimumFractionDigits: 2 })
    };
  };

  const preview = calculatePreview();

  const renderContent = () => {
    switch (activeTab) {
      case 'moneda':
        return (
          <div className="config-form-container">
            <div className="config-section-header">
              <h2 className="config-section-title">Configuración de Moneda</h2>
            </div>

            <div className="currency-info">
              <div className="currency-main-title">
                <FiDollarSign />
                <span>Moneda Principal: Bolívares (VES)</span>
              </div>
              <p className="currency-desc">
                Todos los precios se manejan en Bolívares. Configure la tasa de cambio para
                convertir a dólares u otra moneda.
              </p>
            </div>

            <div className="config-form">
              <div className="form-group">
                <label className="form-label">
                  <FiDollarSign /> Moneda
                </label>
                <select 
                  className="form-control" 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FiRefreshCw /> Tasa de Cambio / Precio de la Moneda
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-control" 
                  value={exchangeRate} 
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                />
                <p className="form-hint">Tasa de cambio o precio de referencia</p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FiPercent /> IVA (%)
                </label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={iva} 
                  onChange={(e) => setIva(parseFloat(e.target.value) || 0)}
                />
                <p className="form-hint">Porcentaje de impuesto IVA</p>
              </div>

              <div className="preview-box">
                <span>Ejemplo: 100 {currency} = </span>
                <strong>Bs. {preview.subtotal}</strong>
                <span className="iva-text">Monto con IVA ({iva}%):Bs. {preview.total}</span>
              </div>

              <button 
                className="btn-save"
                disabled={isLoading}
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    await configService.saveCurrencyConfig({ currency, exchangeRate, iva });
                    Swal.fire({
                      icon: 'success',
                      title: '¡Guardado!',
                      text: 'Configuración de moneda actualizada.',
                      timer: 2000,
                      showConfirmButton: false
                    });
                  } catch (error) {
                    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la configuración.' });
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {isLoading ? <FiRefreshCw className="spin" /> : <FiSave />}
                {isLoading ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        );
      case 'precios':
        return (
          <div className="config-form-container">
            <div className="config-header-actions">
              <h2 className="config-section-title">Configuración de Precios</h2>
              <button 
                className="btn-add-bottle"
                onClick={async () => {
                  const { value: size } = await Swal.fire({
                    title: 'Nuevo Botellón',
                    text: 'Capacidad del botellón (Litros):',
                    input: 'number',
                    inputAttributes: { min: '0', max: '100', step: '1' },
                    showCancelButton: true,
                    confirmButtonText: 'Siguiente',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: 'var(--accent)',
                    inputValidator: (value) => {
                      if (!value) {
                        return 'Debes ingresar la capacidad';
                      }
                      if (parseFloat(value) < 0 || parseFloat(value) > 100) {
                        return 'La capacidad debe estar entre 0 y 100 litros';
                      }
                    }
                  });

                  if (size) {
                    const { value: price } = await Swal.fire({
                      title: `Botellón de ${size}L`,
                      text: 'Precio ($):',
                      input: 'number',
                      inputAttributes: { min: '0', max: '9999', step: '0.1' },
                      showCancelButton: true,
                      confirmButtonText: 'Agregar',
                      cancelButtonText: 'Cancelar',
                      confirmButtonColor: 'var(--accent)',
                      inputValidator: (value) => {
                        if (!value) {
                          return 'Debes ingresar un precio';
                        }
                        if (parseFloat(value) < 0 || parseFloat(value) > 9999) {
                          return 'El precio no puede exceder los 4 dígitos (máx 9999)';
                        }
                      }
                    });

                    if (price) {
                      setIsLoading(true);
                      try {
                        const newBottles = [...bottles, { 
                          id: Date.now(), 
                          size: parseFloat(size), 
                          price: parseFloat(price) 
                        }];
                        await configService.savePricingConfig({ waterPrice, deliveryPrice, bottles: newBottles });
                        setBottles(newBottles);
                        Swal.fire({
                          icon: 'success',
                          title: 'Agregado',
                          text: 'El botellón ha sido registrado.',
                          timer: 1500,
                          showConfirmButton: false
                        });
                      } catch (error) {
                        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo agregar el botellón.' });
                      } finally {
                        setIsLoading(false);
                      }
                    }
                  }
                }}
              >
                <FiPlus /> Agregar Botellón
              </button>
            </div>

            <div className="price-items-list">
              {/* Precio por Litro */}
              <div className="price-item-card">
                <div className="price-item-icon-wrap">
                  <FiDroplet />
                </div>
                <div className="price-item-info">
                  <p className="price-item-label">Precio por Litro de Agua</p>
                  <div className="price-item-input-wrap">
                    <span className="price-item-currency">$</span>
                    <input 
                      type="number" 
                      step="0.1"
                      className="price-item-input" 
                      value={waterPrice}
                      onChange={(e) => setWaterPrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              {/* Botellones Dinámicos */}
              {bottles.map((bottle) => (
                <div className="price-item-card" key={bottle.id}>
                  <div className="price-item-icon-wrap">
                    <FiPackage />
                  </div>
                  <div className="price-item-info">
                    <p className="price-item-label">Botellón {bottle.size} Litros</p>
                    <div className="price-item-input-wrap">
                      <span className="price-item-currency">$</span>
                      <input 
                        type="number" 
                        step="0.5"
                        className="price-item-input" 
                        value={bottle.price}
                        onChange={(e) => {
                          const newBottles = bottles.map(b => 
                            b.id === bottle.id ? { ...b, price: parseFloat(e.target.value) || 0 } : b
                          );
                          setBottles(newBottles);
                        }}
                      />
                    </div>
                  </div>
                  <button 
                    className="btn-ver" 
                    disabled={isLoading}
                    style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={async () => {
                      const result = await Swal.fire({
                        title: '¿Eliminar botellón?',
                        text: `Se eliminará el botellón de ${bottle.size} Litros.`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#ef4444',
                        cancelButtonColor: 'var(--muted)',
                        confirmButtonText: 'Sí, eliminar',
                        cancelButtonText: 'Cancelar'
                      });

                      if (result.isConfirmed) {
                        setIsLoading(true);
                        try {
                          const newBottles = bottles.filter(b => b.id !== bottle.id);
                          await configService.savePricingConfig({ waterPrice, deliveryPrice, bottles: newBottles });
                          setBottles(newBottles);
                          Swal.fire({
                            icon: 'success',
                            title: 'Eliminado',
                            timer: 1500,
                            showConfirmButton: false
                          });
                        } catch (error) {
                          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el botellón.' });
                        } finally {
                          setIsLoading(false);
                        }
                      }
                    }}
                    title="Eliminar"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}

              {/* Delivery */}
              <div className="price-item-card">
                <div className="price-item-icon-wrap">
                  <FiTruck />
                </div>
                <div className="price-item-info">
                  <p className="price-item-label">Tarifa de Delivery</p>
                  <div className="price-item-input-wrap">
                    <span className="price-item-currency">$</span>
                    <input 
                      type="number" 
                      step="0.5"
                      className="price-item-input" 
                      value={deliveryPrice}
                      onChange={(e) => setDeliveryPrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              <button 
                className="btn-save" 
                disabled={isLoading}
                style={{ width: 'fit-content' }}
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    await configService.savePricingConfig({ waterPrice, deliveryPrice, bottles });
                    Swal.fire({
                      icon: 'success',
                      title: '¡Guardado!',
                      text: 'Los precios se han actualizado correctamente.',
                      timer: 2000,
                      showConfirmButton: false,
                      confirmButtonColor: 'var(--accent)'
                    });
                  } catch (error) {
                    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron guardar los precios.' });
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {isLoading ? <FiRefreshCw className="spin" /> : <FiSave />}
                {isLoading ? 'Guardando...' : 'Guardar Precios'}
              </button>
            </div>
          </div>
        );
      case 'usuarios':
        return (
          <div className="config-form-container">
            <div className="table-controls">
              <div className="rows-selector">
                <span>Mostrar:</span>
                <select 
                  value={rowsPerPage} 
                  onChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value));
                    setCurrentPageUsers(1);
                  }}
                >
                  <option value={5}>5 filas</option>
                  <option value={10}>10 filas</option>
                  <option value={20}>20 filas</option>
                </select>
              </div>
              <button 
                className="btn-add-bottle"
                onClick={async () => {
                  let sucursalesList = [];
                  try {
                    sucursalesList = await configService.getSucursales();
                  } catch {
                    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las sucursales.' });
                    return;
                  }
                  const roleOpts = configService.ROL_OPCIONES.map(
                    (r) => `<option value="${r.id}">${escHtml(r.nombre)}</option>`
                  ).join('');
                  const sucOpts = sucursalesList.map(
                    (s) => `<option value="${s.id}">${escHtml(s.nombre)}</option>`
                  ).join('');

                  const { value: formValues } = await Swal.fire({
                    title: '<span style="color: var(--text); font-family: var(--font-title);">Agregar nuevo usuario</span>',
                    html: `
                      <div style="text-align: left; margin-top: 20px;">
                        <label style="font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 8px; display: block;">Nombre completo</label>
                        <input id="swal-input-name" class="swal2-input" style="margin: 0 0 16px 0; width: 100%; box-sizing: border-box;" placeholder="Ej: Pedro Pérez">
                        <label style="font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 8px; display: block;">Cédula</label>
                        <input id="swal-input-cedula" class="swal2-input" style="margin: 0 0 16px 0; width: 100%; box-sizing: border-box;" placeholder="V-12345678">
                        <label style="font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 8px; display: block;">Correo</label>
                        <input id="swal-input-email" type="email" class="swal2-input" style="margin: 0 0 16px 0; width: 100%; box-sizing: border-box;" placeholder="ejemplo@correo.com">
                        <label style="font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 8px; display: block;">Contraseña</label>
                        <input id="swal-input-pass" type="password" class="swal2-input" style="margin: 0 0 16px 0; width: 100%; box-sizing: border-box;" placeholder="Mín. 8 caracteres, mayúsculas, minúsculas y números">
                        <label style="font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 8px; display: block;">Rol</label>
                        <select id="swal-input-role" class="swal2-input" style="margin: 0 0 16px 0; width: 100%; box-sizing: border-box;">${roleOpts}</select>
                        <label style="font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 8px; display: block;">Sucursal</label>
                        <select id="swal-input-sucursal" class="swal2-input" style="margin: 0; width: 100%; box-sizing: border-box;">${sucOpts}</select>
                      </div>
                    `,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: 'Crear usuario',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: 'var(--accent)',
                    cancelButtonColor: 'var(--muted)',
                    preConfirm: () => {
                      const name = document.getElementById('swal-input-name').value.trim();
                      const cedula = document.getElementById('swal-input-cedula').value.trim();
                      const email = document.getElementById('swal-input-email').value.trim();
                      const password = document.getElementById('swal-input-pass').value;
                      const rolId = document.getElementById('swal-input-role').value;
                      const sucursalId = document.getElementById('swal-input-sucursal').value;
                      if (!name || !cedula || !email) {
                        Swal.showValidationMessage('Nombre, cédula y correo son obligatorios');
                        return false;
                      }
                      if (password.length < 8) {
                        Swal.showValidationMessage('La contraseña debe tener al menos 8 caracteres');
                        return false;
                      }
                      if (!sucursalId) {
                        Swal.showValidationMessage('Selecciona una sucursal');
                        return false;
                      }
                      return { name, cedula, email, password, rolId, sucursalId };
                    }
                  });

                  if (formValues) {
                    setIsLoading(true);
                    try {
                      await configService.createUsuario(formValues);
                      setUsers(await configService.getUsers());
                      Swal.fire({
                        icon: 'success',
                        title: 'Usuario creado',
                        text: `${formValues.name} ha sido registrado.`,
                        timer: 2000,
                        showConfirmButton: false
                      });
                    } catch (error) {
                      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo crear el usuario.' });
                    } finally {
                      setIsLoading(false);
                    }
                  }
                }}
              >
                <FiUserPlus /> Nuevo Usuario
              </button>
            </div>

            <div className="config-table-wrap">
              <table className="config-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="user-info-cell">
                          <div className="user-avatar-placeholder">
                            {(u.name || '?').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600 }}>{u.name}</p>
                            <p className="td-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>{u.role}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`user-status-dot ${u.status === 'active' ? '' : 'inactive'}`} />
                          {u.status === 'active' ? 'Activo' : 'Inactivo'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-table-action" title="Editar"><FiEdit2 /></button>
                          <button 
                            className="btn-table-action delete" 
                            title="Eliminar"
                            onClick={async () => {
                              const result = await Swal.fire({
                                title: '¿Eliminar usuario?',
                                text: `Se eliminará permanentemente a ${u.name}.`,
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#ef4444',
                                confirmButtonText: 'Sí, eliminar',
                                cancelButtonText: 'Volver'
                              });
                              if (result.isConfirmed) {
                                setIsLoading(true);
                                try {
                                  await configService.deleteUsuario(u.id);
                                  setUsers(await configService.getUsers());
                                  Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
                                } catch (error) {
                                  Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo eliminar el usuario.' });
                                } finally {
                                  setIsLoading(false);
                                }
                              }
                            }}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="empty-table-state">
                  <FiUsers />
                  <p>No hay usuarios registrados</p>
                </div>
              )}
            </div>

            {users.length > rowsPerPage && (
              <div className="pagination-controls">
                <button 
                  className="btn-pagination" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPageUsers(prev => prev - 1)}
                >
                  <FiChevronLeft /> Anterior
                </button>
                <div className="page-indicator">
                  Página <strong>{currentPage}</strong> de {Math.ceil(users.length / rowsPerPage)}
                </div>
                <button 
                  className="btn-pagination" 
                  disabled={currentPage === Math.ceil(users.length / rowsPerPage)}
                  onClick={() => setCurrentPageUsers(prev => prev + 1)}
                >
                  Siguiente <FiChevronRight />
                </button>
              </div>
            )}
          </div>
        );
      case 'clave':
        return (
          <div className="config-form-container">
            <div className="config-section-header">
              <h2 className="config-section-title">Cambiar Contraseña</h2>
            </div>
            
            <div className="config-form">
              <div className="form-group">
                <label className="form-label"><FiLock />Contraseña Actual</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPass.current ? "text" : "password"} 
                    className="form-control" 
                    value={passwords.current}
                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                    maxLength={15}
                  />
                  <button 
                    type="button"
                    className="btn-show-pass"
                    onClick={() => setShowPass({...showPass, current: !showPass.current})}
                  >
                    {showPass.current ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="password-grid">
                <div className="form-group">
                  <label className="form-label"><FiLock />Nueva Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPass.new ? "text" : "password"} 
                      className="form-control" 
                      value={passwords.new}
                      onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                      maxLength={15}
                    />
                    <button 
                      type="button"
                      className="btn-show-pass"
                      onClick={() => setShowPass({...showPass, new: !showPass.new})}
                    >
                      {showPass.new ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label"><FiLock />Confirmar Nueva Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPass.confirm ? "text" : "password"} 
                      className="form-control" 
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                      maxLength={15}
                    />
                    <button 
                      type="button"
                      className="btn-show-pass"
                      onClick={() => setShowPass({...showPass, confirm: !showPass.confirm})}
                    >
                      {showPass.confirm ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <p className={`password-requirement ${passwords.new.length >= 8 ? 'check' : ''}`}>
                  {passwords.new.length >= 8 ? <FiCheckCircle /> : <FiXCircle />} Mínimo 8 caracteres
                </p>
                <p className={`password-requirement ${/[A-Z]/.test(passwords.new) ? 'check' : ''}`}>
                  {/[A-Z]/.test(passwords.new) ? <FiCheckCircle /> : <FiXCircle />} Al menos una mayúscula
                </p>
                <p className={`password-requirement ${/[0-9]/.test(passwords.new) ? 'check' : ''}`}>
                  {/[0-9]/.test(passwords.new) ? <FiCheckCircle /> : <FiXCircle />} Al menos un número
                </p>
                <p className={`password-requirement ${passwords.new && passwords.new === passwords.confirm ? 'check' : ''}`}>
                  {passwords.new && passwords.new === passwords.confirm ? <FiCheckCircle /> : <FiXCircle />} Las contraseñas coinciden
                </p>
              </div>

              <button 
                className="btn-save"
                onClick={() => {
                  if (passwords.new.length < 8 || !/[A-Z]/.test(passwords.new) || !/[0-9]/.test(passwords.new)) {
                    Swal.fire({ 
                      icon: 'error', 
                      title: 'Seguridad insuficiente', 
                      text: 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.' 
                    });
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
                <FiSave /> Actualizar Contraseña
              </button>
            </div>
          </div>
        );
      case 'general':
        return (
          <div className="config-form-container">
            <div className="config-section-header">
              <h2 className="config-section-title">Configuración General</h2>
            </div>
            
            <div className="config-form">
              <div className="form-group">
                <label className="form-label">
                  <FiBriefcase /> Nombre de la Empresa
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={companyInfo.name}
                  onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
                  placeholder="H2OManager"
                />
              </div>

              <div className="form-group">
                <label className="form-label">RIF / NIT</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={companyInfo.rif}
                  onChange={(e) => setCompanyInfo({...companyInfo, rif: e.target.value})}
                  placeholder="Ej: J-12345678-9"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FiMapPin /> Dirección
                </label>
                <textarea 
                  className="form-control" 
                  rows="3"
                  value={companyInfo.address}
                  onChange={(e) => setCompanyInfo({...companyInfo, address: e.target.value})}
                  placeholder="Dirección de la empresa"
                  style={{ resize: 'none' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FiPhone /> Teléfono
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={companyInfo.phone}
                  onChange={(e) => setCompanyInfo({...companyInfo, phone: e.target.value})}
                  placeholder="+58 424 1234567"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FiMail /> Email de Contacto
                </label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={companyInfo.email}
                  onChange={(e) => setCompanyInfo({...companyInfo, email: e.target.value})}
                  placeholder="contacto@empresa.com"
                />
              </div>

              <button 
                className="btn-save"
                disabled={isLoading}
                onClick={async () => {
                  if (!companyInfo.name || !companyInfo.email) {
                    Swal.fire({ icon: 'error', title: 'Campos requeridos', text: 'El nombre y el email son obligatorios.' });
                    return;
                  }
                  setIsLoading(true);
                  try {
                    await configService.saveGeneralConfig(companyInfo);
                    Swal.fire({
                      icon: 'success',
                      title: '¡Guardado!',
                      text: 'La información general ha sido actualizada.',
                      timer: 2000,
                      showConfirmButton: false
                    });
                  } catch (error) {
                    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la información.' });
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {isLoading ? <FiRefreshCw className="spin" /> : <FiSave />}
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        );
      default:
        return (
          <div className="config-placeholder">
            <div className="config-section-header">
              <h2 className="config-section-title">
                {CONFIG_MENU.find(m => m.id === activeTab)?.label}
              </h2>
            </div>
            <p>Sección en desarrollo...</p>
          </div>
        );
    }
  };

  return (
    <div className="config-layout" style={{ position: 'relative' }}>
      {isLoading && (
        <div className="loading-overlay">
          <FiRefreshCw className="loading-spinner spin" />
          <p className="loading-text">Cargando configuración...</p>
        </div>
      )}
      <div className="config-sidebar">
        <h3 className="config-sidebar-title">Configuración</h3>
        {CONFIG_MENU.map((item) => (
          <div
            key={item.id}
            className={`config-nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon className="config-nav-icon" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="config-content">
        {renderContent()}
      </div>
    </div>
  );
}
