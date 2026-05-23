import { useState } from 'react';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { homePathForRole } from './auth.service';
import Logo from '../../public/Logo.webp';

const SWAL_CLASSES = {
  popup: 'swal-popup',
  title: 'swal-title',
  text: 'swal-text',
  confirmButton: 'swal-confirm-btn',
};

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading, user: authUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function error(ms) {
    Swal.fire({
      icon: 'error',
      title: 'Error de autenticación',
      text: ms,
      confirmButtonText: 'Aceptar',
      customClass: SWAL_CLASSES,
      buttonsStyling: false,
      showCloseButton: true,
    });
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).toLowerCase());
  }

  function validatePassword(value) {
    // Al menos 8 caracteres, una mayúscula, una minúscula y un número
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/.test(value);
  }

  function validateForm() {
    if (!validateEmail(email)) {
      error('Por favor, ingresa un correo electrónico válido.');
      return false;
    }
    if (!validatePassword(password)) {
      error('La contraseña debe tener al menos 8 caracteres, incluyendo una letra mayúscula, una letra minúscula y un número.');
      return false;
    }
    return true;
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const user = await login(email.trim(), password);
      const dest = homePathForRole(user?.role);
      await Swal.fire({
        icon: 'success',
        title: 'Inicio de sesión exitoso',
        text: `¡Bienvenido, ${user.name}!`,
        confirmButtonText: 'Aceptar',
        customClass: SWAL_CLASSES,
        buttonsStyling: false,
        showCloseButton: true,
      });
      navigate(dest, { replace: true });
    } catch (err) {
      error(err?.message || 'No se pudo iniciar sesión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-muted">
        Verificando sesión…
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={homePathForRole(authUser?.role)} replace />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 py-10">
      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-drift absolute -left-32 -top-40 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,#0099e6,transparent_70%)] opacity-20 blur-[90px]" />
        <div className="animate-drift absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,#00c9a7,transparent_70%)] opacity-20 blur-[90px] [animation-delay:-7s]" />
      </div>

      <div className="animate-fade-up w-full max-w-md rounded-3xl border border-border bg-surface/90 p-8 shadow-brand-lg backdrop-blur-sm sm:p-10">
        {/* Encabezado */}
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={Logo} alt="H2O Manager" className="mb-4 h-28 w-auto" />
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-text">
            Bienvenido de nuevo
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Formulario */}
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold text-text">
              <FiMail className="text-accent" />
              Correo
            </label>
            <input
              id="email"
              type="email"
              maxLength={50}
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
              className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10 disabled:opacity-60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="flex items-center gap-2 text-sm font-semibold text-text">
              <FiLock className="text-accent" />
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                maxLength={15}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
                className="w-full rounded-xl border border-border bg-white px-4 py-3 pr-12 text-sm text-text outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPassword)}
                tabIndex={-1}
                aria-label="Mostrar contraseña"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted transition hover:text-accent"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <Link to="/" className="text-muted transition hover:text-accent">
              ← Volver
            </Link>
            <a href="#" className="text-accent opacity-80 transition hover:opacity-100">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-1 flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-br from-accent to-accent2 px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_20px_rgba(0,119,204,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Iniciando sesión...
              </>
            ) : (
              <>
                Ingresar al sistema
                <FiArrowRight className="text-lg" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-muted">
          © 2025 H2OManager ·{' '}
          <a href="#" className="text-accent transition hover:underline">
            Soporte técnico
          </a>
        </p>
      </div>
    </div>
  );
}
