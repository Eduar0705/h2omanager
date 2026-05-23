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
import { MODULE_CONTAINER, MODULE_HEADER, FORM_GROUP, FORM_ROW, FORM_HINT, BTN_MOD_PRIMARY } from "../ui/mod";

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

  const [datos, setDatos] = useState({
    name: user?.name || "",
    email: user?.email || "",
    cedula: user?.cedula || "",
  });
  const [savingDatos, setSavingDatos] = useState(false);

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
      Swal.fire("Cédula inválida", "Usa el formato V-12345678 o E-12345678 (6 a 8 dígitos).", "warning");
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
      Swal.fire({ icon: "success", title: "Perfil actualizado", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Error", err?.message || "No se pudo actualizar el perfil", "error");
    } finally {
      setSavingDatos(false);
    }
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();
    if (!passValida) {
      Swal.fire("Contraseña insegura", "Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.", "warning");
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
      Swal.fire({ icon: "success", title: "Contraseña actualizada", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Error", err?.message || "No se pudo cambiar la contraseña", "error");
    } finally {
      setSavingPass(false);
    }
  };

  const Rule = ({ ok, label }) => (
    <li className={`flex items-center gap-2 text-xs ${ok ? "text-[#16a34a]" : "text-muted"}`}>
      {ok ? <FiCheck className="text-[13px]" /> : <FiCircle className="text-[13px]" />} {label}
    </li>
  );

  return (
    <div className={MODULE_CONTAINER}>
      <div className={MODULE_HEADER}>
        <div className="title-section">
          <h1>Mi Perfil</h1>
          <p>Administra tu información personal y seguridad</p>
        </div>
      </div>

      <div className="grid grid-cols-[320px_1fr] items-start gap-6 max-[900px]:grid-cols-1">
        {/* Tarjeta de identidad */}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-brand">
          <div className="relative flex flex-col items-center px-6 pb-6 pt-[30px] text-center">
            <div className="absolute inset-x-0 top-0 h-[78px] bg-gradient-to-br from-accent to-accent2" />
            <div className="relative z-10 mt-3.5 flex h-[88px] w-[88px] items-center justify-center rounded-full border-4 border-surface bg-surface font-display text-[34px] font-extrabold text-accent shadow-[0_6px_18px_rgba(0,90,180,0.18)]">
              {initials}
            </div>
            <p className="mb-1 mt-3.5 font-display text-xl font-extrabold text-text">{user?.name || "Usuario"}</p>
            <p className="mb-3 break-all text-[13px] text-muted">{user?.email || "—"}</p>
            <span
              className={`inline-block rounded-full px-3.5 py-[5px] text-xs font-bold tracking-wide ${
                esEmpleado ? "bg-accent2/[0.14] text-[#00866d]" : "bg-accent/[0.12] text-[#0066b3]"
              }`}
            >
              {user?.rol || (esEmpleado ? "Empleado" : "Gerente")}
            </span>
          </div>
          <div className="border-t border-border px-[22px] pb-[18px] pt-2">
            {[
              { icon: FiShield, label: "Rol", value: user?.rol || "—" },
              { icon: FiMapPin, label: "Sucursal", value: user?.sucursal || `#${user?.sucursalId ?? "—"}` },
              { icon: FiCreditCard, label: "Cédula", value: user?.cedula || "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] bg-bg text-base text-accent">
                  <Icon />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
                  <span className="text-sm font-semibold text-text">{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Paneles editables */}
        <div className="flex flex-col gap-6">
          <form className="rounded-2xl border border-border bg-surface p-6 shadow-brand" onSubmit={guardarDatos}>
            <div className="mb-4 flex items-center gap-2.5">
              <FiUser className="text-lg text-accent" />
              <h2 className="font-display text-base font-extrabold text-text">Datos personales</h2>
            </div>

            <div className={FORM_GROUP}>
              <label>Nombre completo</label>
              <input value={datos.name} onChange={onDato("name")} maxLength={128} />
            </div>
            <div className={FORM_ROW}>
              <div className={FORM_GROUP}>
                <label>Correo electrónico</label>
                <input type="email" value={datos.email} onChange={onDato("email")} maxLength={120} />
              </div>
              <div className={FORM_GROUP}>
                <label>Cédula / RIF</label>
                <input value={datos.cedula} onChange={onDato("cedula")} placeholder="V-12345678" maxLength={12} />
                <p className={FORM_HINT}>Formato V-12345678 o E-12345678</p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button type="submit" className={BTN_MOD_PRIMARY} disabled={savingDatos}>
                <FiSave /> {savingDatos ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>

          <form className="rounded-2xl border border-border bg-surface p-6 shadow-brand" onSubmit={cambiarPassword}>
            <div className="mb-4 flex items-center gap-2.5">
              <FiLock className="text-lg text-accent" />
              <h2 className="font-display text-base font-extrabold text-text">Cambiar contraseña</h2>
            </div>

            <div className={FORM_ROW}>
              <div className={FORM_GROUP}>
                <label>Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={pass.nueva}
                    onChange={onPass("nueva")}
                    autoComplete="new-password"
                    maxLength={30}
                    className="!pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    aria-label="Mostrar contraseña"
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted transition hover:text-accent"
                  >
                    {showPass ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              <div className={FORM_GROUP}>
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
              <ul className="mt-1.5 flex flex-col gap-1">
                <Rule ok={rules.len} label="Al menos 8 caracteres" />
                <Rule ok={rules.upper} label="Una letra mayúscula" />
                <Rule ok={rules.lower} label="Una letra minúscula" />
                <Rule ok={rules.number} label="Un número" />
              </ul>
            )}

            <div className="mt-4 flex justify-end">
              <button type="submit" className={BTN_MOD_PRIMARY} disabled={savingPass}>
                <FiLock /> {savingPass ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
