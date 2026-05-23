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
    FiMenu
} from 'react-icons/fi'
import { useNavigate, useLocation } from 'react-router-dom'

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
    const esEmpleado = role === 2

    const sidebarWidth = isOpen
        ? 'w-[230px] max-md:w-[260px] max-md:translate-x-0 max-md:border-r'
        : 'w-16 max-md:w-0 max-md:-translate-x-full max-md:border-none'

    return (
        <aside
            className={`fixed left-0 top-0 z-[100] flex h-screen flex-col overflow-hidden border-r border-border bg-surface shadow-[2px_0_20px_var(--shadow)] transition-[width,transform] duration-200 ${sidebarWidth}`}
        >
            {/* Brand / toggle */}
            <div className={`flex min-h-16 flex-shrink-0 items-center gap-2.5 border-b border-border ${isOpen ? 'px-3.5 pb-4 pt-5' : 'justify-center py-3.5'}`}>
                <button
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-border text-sm text-muted transition hover:bg-bg hover:text-accent"
                    onClick={onToggle}
                    aria-label={isOpen ? 'Colapsar menú' : 'Expandir menú'}
                >
                    {isOpen ? <FiChevronLeft /> : <FiMenu />}
                </button>
            </div>

            {/* Role badge */}
            {isOpen && (
                <div className="px-4 pb-0.5 pt-2.5">
                    <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                            esEmpleado
                                ? 'border border-accent2/20 bg-accent2/10 text-accent2'
                                : 'border border-accent/20 bg-accent/10 text-accent'
                        }`}
                    >
                        {esEmpleado ? 'Empleado' : 'Gerente'}
                    </span>
                </div>
            )}

            {isOpen && (
                <p className="whitespace-nowrap px-[18px] pb-1.5 pt-3.5 text-[10px] font-semibold uppercase tracking-[1.4px] text-muted opacity-70">
                    Menú principal
                </p>
            )}

            {/* Menu */}
            <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-2 [scrollbar-width:thin]">
                {menuItems.map(({ id, icon: Icon, label, link }) => {
                    const isActive = location.pathname === link
                    return (
                        <li
                            key={id}
                            className={`group relative flex cursor-pointer select-none items-center gap-2.5 whitespace-nowrap rounded-[10px] text-[13.5px] transition ${
                                isOpen ? 'px-2.5 py-[9px]' : 'justify-center py-[9px]'
                            } ${
                                isActive
                                    ? 'bg-accent/[0.09] font-semibold text-accent'
                                    : 'font-medium text-muted hover:bg-bg hover:text-text'
                            }`}
                            onClick={() => navigate(link)}
                            title={!isOpen ? label : ''}
                        >
                            <span
                                className={`flex h-[34px] w-[34px] min-w-[34px] items-center justify-center rounded-lg transition ${
                                    isActive
                                        ? 'bg-accent/[0.12] text-accent'
                                        : 'group-hover:bg-accent/[0.07] group-hover:text-accent'
                                }`}
                            >
                                <Icon className="text-base" />
                            </span>
                            {isOpen && <span>{label}</span>}
                            {isOpen && isActive && (
                                <span className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                            )}
                        </li>
                    )
                })}
            </ul>

            {/* Footer — Configuración (solo gerente) */}
            {(role === 1 || !role) && (
                <div className="flex-shrink-0 border-t border-border p-2">
                    <div
                        className={`group flex cursor-pointer select-none items-center gap-2.5 whitespace-nowrap rounded-[10px] text-[13.5px] transition ${
                            isOpen ? 'px-2.5 py-[9px]' : 'justify-center py-[9px]'
                        } ${
                            isConfigPage
                                ? 'bg-accent/[0.09] font-semibold text-accent'
                                : 'font-medium text-muted hover:bg-bg hover:text-text'
                        }`}
                        onClick={() => navigate('/gerente/configuracion')}
                        title={!isOpen ? 'Configuración' : ''}
                    >
                        <span
                            className={`flex h-[34px] w-[34px] min-w-[34px] items-center justify-center rounded-lg transition ${
                                isConfigPage ? 'bg-accent/[0.12] text-accent' : 'group-hover:bg-accent/[0.07] group-hover:text-accent'
                            }`}
                        >
                            <FiSettings className="text-base" />
                        </span>
                        {isOpen && <span>Configuración</span>}
                    </div>
                </div>
            )}
        </aside>
    )
}
