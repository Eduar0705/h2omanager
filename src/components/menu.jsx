import {
    FiHome,
    FiUsers,
    FiPackage,
    FiBarChart2,
    FiSettings,
    FiShoppingCart,
    FiUserCheck,
    FiClock,
    FiBookOpen,
    FiChevronLeft,
    FiChevronRight,
    FiMenu
} from 'react-icons/fi'
import { TbBottle } from 'react-icons/tb'
import { useNavigate, useLocation } from 'react-router-dom'
import '../assets/css/menu.css'
import Logo from '../../public/Logo.webp'

const MENU_GERENTE = [
    { id: 'home',        icon: FiHome,        label: 'Dashboard',   link: '/gerente/home' },
    { id: 'clientes',    icon: FiUsers,       label: 'Clientes',    link: '/gerente/clientes' },
    { id: 'botellones',  icon: FiPackage,     label: 'Botellones',  link: '/gerente/botellones' },
    { id: 'ventas',      icon: FiShoppingCart,label: 'Ventas',      link: '/gerente/ventas' },
    { id: 'empleados',   icon: FiUserCheck,   label: 'Empleados',   link: '/gerente/empleados' },
    { id: 'historial',   icon: FiClock,       label: 'Historial',   link: '/gerente/historial' },

    { id: 'proveedores', icon: FiUserCheck,   label: 'Proveedores', link: '/gerente/proveedores' },
    { id: 'reportes',    icon: FiBarChart2,   label: 'Reportes',    link: '/gerente/reportes' },
    { id: 'contabilidad', icon: FiBookOpen,   label: 'Contabilidad', link: '/gerente/contabilidad' },
]

const MENU_EMPLEADO = [
    { id: 'home',       icon: FiHome,         label: 'Dashboard',   link: '/empleado/home' },
    { id: 'clientes',   icon: FiUsers,        label: 'Clientes',    link: '/empleado/clientes' },
    { id: 'botellones', icon: FiPackage,      label: 'Botellones',  link: '/empleado/botellones' },
    { id: 'ventas',     icon: FiShoppingCart, label: 'Ventas',      link: '/empleado/ventas' },
    { id: 'historial',  icon: FiClock,        label: 'Historial',   link: '/empleado/historial' },

]

const MENU_BY_ROLE = {
    1: MENU_GERENTE,
    2: MENU_EMPLEADO,
}

export default function Sidebar({ isOpen, onToggle, role }) {
    const navigate = useNavigate()
    const location = useLocation()

    // Si no hay rol o es desconocido → gerente por defecto
    const menuItems = MENU_BY_ROLE[role] ?? MENU_GERENTE

    const isConfigPage = location.pathname.includes('configuracion')

    return (
        <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>

            {/* Brand */}
            <div className="sidebar-brand">
                <button
                    className="sidebar-toggle"
                    onClick={onToggle}
                    aria-label={isOpen ? "Colapsar menú" : "Expandir menú"}
                >
                    {isOpen ? <FiChevronLeft /> : <FiMenu />}
                </button>
            </div>

            {/* Role badge */}
            {isOpen && (
                <div className="role-badge">
                    <span className={`role-pill role-${role === 2 ? 'empleado' : 'gerente'}`}>
                        {role === 2 ? 'Empleado' : 'Gerente'}
                    </span>
                </div>
            )}

            {isOpen && <p className="nav-section-label">Menú principal</p>}

            {/* Menu */}
            <ul className="menu-list">
                {menuItems.map(({ id, icon: Icon, label, link }) => {
                    const isActive = location.pathname === link
                    return (
                        <li
                            key={id}
                            className={`menu-item ${isActive ? 'active' : ''}`}
                            onClick={() => navigate(link)}
                            title={!isOpen ? label : ''}
                        >
                            <span className="menu-icon-wrap">
                                <Icon className="menu-icon" />
                            </span>
                            {isOpen && <span className="menu-label">{label}</span>}
                            {isOpen && isActive && <span className="active-dot" />}
                        </li>
                    )
                })}
            </ul>

            {/* Footer — Configuración (solo gerente) */}
            {(role === 1 || !role) && (
                <div className="sidebar-footer">
                    <div
                        className={`menu-item ${isConfigPage ? 'active' : ''}`}
                        onClick={() => navigate(role === 2 ? '/empleado/configuracion' : '/gerente/configuracion')}
                        title={!isOpen ? 'Configuración' : ''}
                    >
                        <span className="menu-icon-wrap">
                            <FiSettings className="menu-icon" />
                        </span>
                        {isOpen && <span className="menu-label">Configuración</span>}
                    </div>
                </div>
            )}

        </aside>
    )
}