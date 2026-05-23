import { useState } from "react";
import {
  FiUser,
  FiMail,
  FiCreditCard,
  FiShield,
  FiMapPin,
  FiLock,
  FiEye,
  FiEyeOff,
  FiSave,
  FiCheck,
  FiCircle,
} from "react-icons/fi";
import Swal from "sweetalert2";
import { useAuth } from "../auth/AuthContext";
import { updateUsuario } from "../gerente/services/usuarios.service";
import "../assets/css/modulos.css";
import "../assets/css/perfil.css";

const CEDULA_RE = /^(V|E)-?\d{6,8}$/i;

const passRules = (pw) => ({
  len: pw.length >= 8,
  upper: /[A-Z]/.test(pw),
  lower: /[a-z]/.test(pw),
  number: /\d/.test(pw),
});

export default function Perfil() {
  const { user, refreshUser } = useAuth();
  const esEmpleado = Number(user?.role) === 2;
  const initials = user?.name?.charAt(0)?.toUpperCase() || "U";

  // Datos personales
  const [datos, setDatos] = useState({
    name: user?.name || "",
    email: user?.email || "",
    cedula: user?.cedula || "",
  });
  const [savingDatos, setSavingDatos] = useState(false);

  // Seguridad
  const [pass, setPass] = useState({ nueva: "", confirmar: "" });
  const [showPass, setShowPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const rules = passRules(pass.nueva);
  const passValida = rules.len && rules.upper && rules.lower && rules.number;

  const onDato = (key) => (e) => setDatos((p) => ({ ...p, [key]: e.target.value }));
  const onPass = (key) => (e) => setPass((p) => ({ ...p, [key]: e.target.value }));

  const guardarDatos = async (e) => {
    e.preventDefault();
    if (!datos.name.trim()) {
      Swal.fire("Datos incompletos", "El nombre es obligatorio.", "warning");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) {
      Swal.fire("Email inválido", "Ingresa un correo electrónico válido.", "warning");
      return;
    }
    if (!CEDULA_RE.test(datos.cedula.trim())) {
      Swal.fire(
        "Cédula inválida",
        "Usa el formato V-12345678 o E-12345678 (6 a 8 dígitos).",
        "warning"
      );
      return;
    }
    setSavingDatos(true);
    try {
      await updateUsuario(user.id, {
        name: datos.name.trim(),
        email: datos.email.trim(),
        cedula: datos.cedula.trim().toUpperCase(),
      });
      await refreshUser();
      Swal.fire({
        icon: "success",
        title: "Perfil actualizado",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire("Error", err?.message || "No se pudo actualizar el perfil", "error");
    } finally {
      setSavingDatos(false);
    }
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();
    if (!passValida) {
      Swal.fire(
        "Contraseña insegura",
        "Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.",
        "warning"
      );
      return;
    }
    if (pass.nueva !== pass.confirmar) {
      Swal.fire("No coinciden", "La confirmación no coincide con la nueva contraseña.", "warning");
      return;
    }
    setSavingPass(true);
    try {
      await updateUsuario(user.id, { password: pass.nueva });
      setPass({ nueva: "", confirmar: "" });
      Swal.fire({
        icon: "success",
        title: "Contraseña actualizada",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire("Error", err?.message || "No se pudo cambiar la contraseña", "error");
    } finally {
      setSavingPass(false);
    }
  };

  const Rule = ({ ok, label }) => (
    <li className={`password-rule ${ok ? "ok" : ""}`}>
      {ok ? <FiCheck /> : <FiCircle />} {label}
    </li>
  );

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="title-section">
          <h1>Mi Perfil</h1>
          <p>Administra tu información personal y seguridad</p>
        </div>
      </div>

      <div className="perfil-grid">
        {/* Tarjeta de identidad */}
        <div className="perfil-card">
          <div className="perfil-id">
            <div className="perfil-avatar">{initials}</div>
            <p className="perfil-name">{user?.name || "Usuario"}</p>
            <p className="perfil-email">{user?.email || "—"}</p>
            <span className={`perfil-role-pill ${esEmpleado ? "empleado" : "gerente"}`}>
              {user?.rol || (esEmpleado ? "Empleado" : "Gerente")}
            </span>
          </div>
          <div className="perfil-meta">
            <div className="perfil-meta-row">
              <div className="perfil-meta-icon"><FiShield /></div>
              <div className="perfil-meta-info">
                <span className="perfil-meta-label">Rol</span>
                <span className="perfil-meta-value">{user?.rol || "—"}</span>
              </div>
            </div>
            <div className="perfil-meta-row">
              <div className="perfil-meta-icon"><FiMapPin /></div>
              <div className="perfil-meta-info">
                <span className="perfil-meta-label">Sucursal</span>
                <span className="perfil-meta-value">{user?.sucursal || `#${user?.sucursalId ?? "—"}`}</span>
              </div>
            </div>
            <div className="perfil-meta-row">
              <div className="perfil-meta-icon"><FiCreditCard /></div>
              <div className="perfil-meta-info">
                <span className="perfil-meta-label">Cédula</span>
                <span className="perfil-meta-value">{user?.cedula || "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Paneles editables */}
        <div className="perfil-panels">
          <form className="perfil-panel" onSubmit={guardarDatos}>
            <div className="perfil-panel-head">
              <FiUser />
              <h2>Datos personales</h2>
            </div>

            <div className="mod-form-group">
              <label>Nombre completo</label>
              <input value={datos.name} onChange={onDato("name")} maxLength={128} />
            </div>
            <div className="mod-form-row">
              <div className="mod-form-group">
                <label>Correo electrónico</label>
                <div className="input-with-icon">
                  <input
                    type="email"
                    value={datos.email}
                    onChange={onDato("email")}
                    maxLength={120}
                  />
                </div>
              </div>
              <div className="mod-form-group">
                <label>Cédula / RIF</label>
                <input
                  value={datos.cedula}
                  onChange={onDato("cedula")}
                  placeholder="V-12345678"
                  maxLength={12}
                />
                <p className="mod-form-hint">Formato V-12345678 o E-12345678</p>
              </div>
            </div>

            <div className="perfil-panel-actions">
              <button type="submit" className="btn-mod primary" disabled={savingDatos}>
                <FiSave /> {savingDatos ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>

          <form className="perfil-panel" onSubmit={cambiarPassword}>
            <div className="perfil-panel-head">
              <FiLock />
              <h2>Cambiar contraseña</h2>
            </div>

            <div className="mod-form-row">
              <div className="mod-form-group">
                <label>Nueva contraseña</label>
                <div className="input-with-icon">
                  <input
                    type={showPass ? "text" : "password"}
                    value={pass.nueva}
                    onChange={onPass("nueva")}
                    autoComplete="new-password"
                    maxLength={30}
                  />
                  <button
                    type="button"
                    className="btn-show-pass"
                    onClick={() => setShowPass((s) => !s)}
                    aria-label="Mostrar contraseña"
                    tabIndex={-1}
                  >
                    {showPass ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              <div className="mod-form-group">
                <label>Confirmar contraseña</label>
                <input
                  type={showPass ? "text" : "password"}
                  value={pass.confirmar}
                  onChange={onPass("confirmar")}
                  autoComplete="new-password"
                  maxLength={30}
                />
              </div>
            </div>

            {pass.nueva.length > 0 && (
              <ul className="password-rules">
                <Rule ok={rules.len} label="Al menos 8 caracteres" />
                <Rule ok={rules.upper} label="Una letra mayúscula" />
                <Rule ok={rules.lower} label="Una letra minúscula" />
                <Rule ok={rules.number} label="Un número" />
              </ul>
            )}

            <div className="perfil-panel-actions">
              <button type="submit" className="btn-mod primary" disabled={savingPass}>
                <FiLock /> {savingPass ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
