import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import Logo from '../public/Logo.webp';

const STATS = [
  { value: '600+', label: 'Botellones en stock' },
  { value: '48', label: 'Ventas hoy' },
  { value: '312', label: 'Clientes activos' },
  { value: '99%', label: 'Uptime del sistema' },
];

export default function Index() {
  return (
    <div className="relative flex min-h-screen flex-col bg-bg text-text">
      {/* Fondo decorativo */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="animate-drift absolute -left-32 -top-44 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,#0099e6,transparent_70%)] opacity-20 blur-[90px]" />
        <div className="animate-drift absolute -bottom-28 -right-28 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,#00c9a7,transparent_70%)] opacity-20 blur-[90px] [animation-delay:-7s]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,119,204,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,119,204,0.05)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_90%_80%_at_50%_30%,black_20%,transparent_100%)]" />
      </div>

      {/* Navbar */}
      <nav className="animate-fade-down flex items-center justify-between px-6 py-5 sm:px-12">
        <div className="flex items-center gap-3">
          <img src={Logo} alt="H2O Manager" className="h-20 w-auto sm:h-24" />
        </div>
        <span className="hidden rounded-full border border-border bg-surface/80 px-4 py-2 text-xs font-medium text-muted shadow-brand backdrop-blur sm:inline-block">
          Sistema Gerencial v2.0
        </span>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
        <div className="animate-fade-up mb-6 inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent [animation-delay:0.1s]">
          <span className="h-px w-6 bg-accent/50" />
          Gestión Integral
          <span className="h-px w-6 bg-accent/50" />
        </div>

        <h1 className="animate-fade-up mb-6 max-w-3xl font-display text-[clamp(40px,6.5vw,82px)] font-extrabold leading-[1.02] tracking-[-2px] [animation-delay:0.2s]">
          Control total de tu{' '}
          <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
            embotelladora
          </span>
        </h1>

        <p className="animate-fade-up mb-12 max-w-md text-base font-light leading-relaxed text-muted [animation-delay:0.3s] sm:text-lg">
          Monitorea producción, inventario y distribución en tiempo real.
          Diseñado para gerentes que necesitan decisiones claras y rápidas.
        </p>

        <div className="animate-fade-up flex flex-col items-center gap-3.5 [animation-delay:0.4s]">
          <Link
            to="/login"
            className="group inline-flex items-center gap-2.5 rounded-full bg-gradient-to-br from-accent to-accent2 px-10 py-4 text-[15px] font-semibold text-white shadow-[0_4px_24px_rgba(0,119,204,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_8px_36px_rgba(0,119,204,0.34)] active:scale-95"
          >
            Ingresar al sistema
            <FiArrowRight className="text-lg transition-transform duration-200 group-hover:translate-x-1.5" />
          </Link>
          <span className="text-xs italic text-muted">
            Acceso restringido · Solo personal autorizado
          </span>
        </div>
      </section>

      {/* Stats */}
      <div className="animate-fade-up relative z-10 mx-auto mb-10 grid w-full max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border/60 shadow-brand [animation-delay:0.55s] md:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="bg-surface px-6 py-7 text-center transition-colors hover:bg-bg2"
          >
            <div className="bg-gradient-to-br from-accent to-accent2 bg-clip-text font-display text-3xl font-extrabold tracking-tight text-transparent">
              {s.value}
            </div>
            <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-6 py-6 sm:px-12">
        <p className="text-xs text-muted">© 2025 H2OManager · Todos los derechos reservados</p>
        <a href="#" className="text-xs text-accent opacity-70 transition-opacity hover:opacity-100">
          Soporte técnico
        </a>
      </footer>
    </div>
  );
}
