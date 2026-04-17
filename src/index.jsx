import React from 'react';
import './assets/css/style.css';
import Logo from '../public/Logo.webp'

export default function Index() {
    return (
        <div className="page">

        {/* Background */}
        <div className="bg-layer">
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="grid-overlay" />
        </div>

        {/* NAV */}
        <nav className="navbar">
            <div className="nav-brand">
                <img src={Logo} alt="Logo" style={{height: '150px'}} />
            </div>
            <span className="nav-tag">Sistema Gerencial v2.0</span>
        </nav>

        {/* HERO */}
        <section className="hero">
            <div className="eyebrow">
            <span className="eyebrow-line" />
            Gestión Integral
            <span className="eyebrow-line" />
            </div>

            <h1>
            Control total de tu<br />
            <span className="highlight">embotelladora</span>
            </h1>

            <p className="subtitle">
            Monitorea producción, inventario y distribución en tiempo real.
            Diseñado para gerentes que necesitan decisiones claras y rápidas.
            </p>

            <div className="cta-wrap">
            <a href="/login" className="btn-login">
                Ingresar al sistema
                <span className="btn-arrow">→</span>
            </a>
            <span className="cta-note">Acceso restringido · Solo personal autorizado</span>
            </div>
        </section>

        {/* STATS */}
        <div className="stats-bar">
            {[
            { value: '600+', label: 'Botellones en stock' },
            { value: '48',     label: 'Ventas hoy' },
            { value: '312',    label: 'Clientes activos' },
            { value: '99%',    label: 'Uptime del sistema' },
            ].map((s, i) => (
            <div className="stat-item" key={i}>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
            </div>
            ))}
        </div>

        {/* FOOTER */}
        <footer className="footer">
            <p>© 2025 H2OManager · Todos los derechos reservados</p>
            <a href="#">Soporte técnico</a>
        </footer>

        </div>
    );
}