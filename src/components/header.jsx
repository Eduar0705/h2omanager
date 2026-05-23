import { FiMenu, FiBell, FiChevronDown, FiLogOut, FiUser } from 'react-icons/fi'
import { TbBottle } from 'react-icons/tb'
import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import '../assets/css/navbar.css'
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

    const roleLabel = user?.role === 2 ? 'Empleado' : 'Gerente'
    const initials  = user?.name?.charAt(0)?.toUpperCase() || 'U'

    return (
        <nav className="topnav">

            {/* Izquierda — toggle + brand */}
            <div className="topnav-left">
                <button 
                    className="topnav-toggle" 
                    onClick={toggleSidebar}
                    aria-label="Abrir menú"
                >
                    <FiMenu />
                </button>
                <div className="topnav-brand">
                    <img src={Logo} alt="Logo" style={{ width: '50px', borderRadius: '50%' }} />
                    <span className="topnav-brand-name">
                        H2O<span>Manager</span>
                    </span>
                </div>
            </div>

            {/* Derecha — notificaciones + usuario */}
            <div className="topnav-right">

                {/* Notificaciones */}
                <button className="topnav-icon-btn" aria-label="Notificaciones">
                    <FiBell />
                    <span className="topnav-notif-dot" />
                </button>

                {/* Usuario */}
                <div
                    className="topnav-user"
                    ref={menuRef}
                    onClick={() => setShowUserMenu(!showUserMenu)}
                >
                    <div className="topnav-avatar">{initials}</div>

                    <div className="topnav-user-info">
                        <span className="topnav-user-name">{user?.name || 'Usuario'}</span>
                        <span className={`topnav-role-pill role-${user?.role === 2 ? 'empleado' : 'gerente'}`}>
                            {roleLabel}
                        </span>
                    </div>

                    <FiChevronDown className={`topnav-chevron ${showUserMenu ? 'rotated' : ''}`} />

                    {/* Dropdown */}
                    {showUserMenu && (
                        <div className="topnav-dropdown">
                            <div className="topnav-dropdown-header">
                                <div className="topnav-avatar sm">{initials}</div>
                                <div>
                                    <p className="dd-name">{user?.name || 'Usuario'}</p>
                                    <p className="dd-email">{user?.email || ''}</p>
                                </div>
                            </div>

                            <div className="topnav-dropdown-divider" />

                            <button className="topnav-dd-item" onClick={handlePerfil}>
                                <FiUser />
                                <span>Mi Perfil</span>
                            </button>

                            <div className="topnav-dropdown-divider" />

                            <button
                                className="topnav-dd-item danger"
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