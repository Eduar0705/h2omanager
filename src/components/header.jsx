import { FiMenu, FiBell, FiChevronDown, FiLogOut, FiUser } from 'react-icons/fi'
import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import Logo from '../../public/Logo.webp'

export default function Navbar({ toggleSidebar, user, onLogout }) {
    const [showUserMenu, setShowUserMenu] = useState(false)
    const menuRef = useRef(null)
    const navigate = useNavigate()

    // Cerrar menú al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowUserMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = () => {
        setShowUserMenu(false)
        toast.success('Sesión cerrada correctamente')
        setTimeout(() => onLogout(), 500)
        navigate("/login")
    }

    const handlePerfil = () => {
        setShowUserMenu(false)
        navigate(user?.role === 2 ? '/empleado/perfil' : '/gerente/perfil')
    }

    const esEmpleado = user?.role === 2
    const roleLabel = esEmpleado ? 'Empleado' : 'Gerente'
    const initials = user?.name?.charAt(0)?.toUpperCase() || 'U'

    const rolePillCls = esEmpleado
        ? 'bg-accent2/10 text-accent2 border border-accent2/20'
        : 'bg-accent/10 text-accent border border-accent/20'

    return (
        <nav className="sticky top-0 z-[99] flex h-[60px] items-center justify-between border-b border-border bg-surface px-5 pl-4 font-body shadow-[0_2px_16px_var(--shadow)]">
            {/* Izquierda — toggle + brand */}
            <div className="flex items-center gap-3.5">
                <button
                    className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-border text-lg text-muted transition hover:bg-bg hover:text-accent md:hidden"
                    onClick={toggleSidebar}
                    aria-label="Abrir menú"
                >
                    <FiMenu />
                </button>
                <div className="flex items-center gap-2.5">
                    <img src={Logo} alt="Logo" className="h-[50px] w-[50px] rounded-full" />
                    <span className="font-display text-lg font-extrabold tracking-tight text-text max-[480px]:hidden">
                        H2O<span className="text-accent">Manager</span>
                    </span>
                </div>
            </div>

            {/* Derecha — notificaciones + usuario */}
            <div className="flex items-center gap-2.5">
                {/* Notificaciones */}
                <button
                    className="relative flex h-9 w-9 items-center justify-center rounded-[9px] border border-border text-[17px] text-muted transition hover:bg-bg hover:text-accent"
                    aria-label="Notificaciones"
                >
                    <FiBell />
                    <span className="absolute right-[7px] top-[7px] h-[7px] w-[7px] rounded-full border-2 border-surface bg-danger" />
                </button>

                {/* Usuario */}
                <div
                    className="relative flex cursor-pointer select-none items-center gap-2.5 rounded-[10px] border border-border bg-bg py-[5px] pl-[5px] pr-2.5 transition hover:border-accent hover:bg-surface max-[480px]:border-none max-[480px]:bg-transparent max-[480px]:p-1"
                    ref={menuRef}
                    onClick={() => setShowUserMenu(!showUserMenu)}
                >
                    <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent2 font-display text-[13px] font-extrabold text-white">
                        {initials}
                    </div>

                    <div className="flex flex-col gap-0.5 leading-none max-[480px]:hidden">
                        <span className="whitespace-nowrap text-[13px] font-semibold text-text">{user?.name || 'Usuario'}</span>
                        <span className={`rounded-full px-[7px] py-0.5 text-[10px] font-semibold uppercase tracking-wider ${rolePillCls}`}>
                            {roleLabel}
                        </span>
                    </div>

                    <FiChevronDown
                        className={`flex-shrink-0 text-[15px] text-muted transition-transform duration-200 max-[480px]:hidden ${showUserMenu ? 'rotate-180' : ''}`}
                    />

                    {/* Dropdown */}
                    {showUserMenu && (
                        <div className="absolute right-0 top-[calc(100%+8px)] z-[200] min-w-[210px] animate-[fadeDown_0.18s_ease_both] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_8px_32px_var(--shadow)]">
                            <div className="flex items-center gap-2.5 px-3.5 pb-3 pt-3.5">
                                <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-accent to-accent2 font-display text-sm font-extrabold text-white">
                                    {initials}
                                </div>
                                <div>
                                    <p className="text-[13.5px] font-semibold leading-tight text-text">{user?.name || 'Usuario'}</p>
                                    <p className="mt-px text-[11.5px] text-muted">{user?.email || ''}</p>
                                </div>
                            </div>

                            <div className="h-px bg-border" />

                            <button
                                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] font-medium text-text transition hover:bg-bg [&>svg]:text-[15px] [&>svg]:text-muted"
                                onClick={handlePerfil}
                            >
                                <FiUser />
                                <span>Mi Perfil</span>
                            </button>

                            <div className="h-px bg-border" />

                            <button
                                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] font-medium text-danger transition hover:bg-danger/[0.06] [&>svg]:text-[15px] [&>svg]:text-danger"
                                onClick={handleLogout}
                            >
                                <FiLogOut />
                                <span>Cerrar Sesión</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    )
}
