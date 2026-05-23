import { useState } from 'react'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi'
import Swal from 'sweetalert2';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { homePathForRole } from './auth.service';
import '../assets/css/login.css'
import Logo from '../../public/Logo.webp'

export default function Login() {
    const navigate = useNavigate();
    const { login, isAuthenticated, loading: authLoading, user: authUser } = useAuth();
    const [email, setEmail]           = useState('')
    const [password, setPassword]     = useState('')
    const [showPassword, setShowPass] = useState(false)
    const [isLoading, setIsLoading]   = useState(false)

    function error(ms){
        Swal.fire({
            icon: 'error',
            title: 'Error de autenticación',
            text: ms,
            confirmButtonText: 'Aceptar',
            customClass: {
                popup: 'swal-popup',
                title: 'swal-title',
                text: 'swal-text',
                confirmButton: 'swal-confirm-btn'
            },
            buttonsStyling: false,
            showCloseButton: true
        })
    }
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return re.test(String(email).toLowerCase())
    }
    function validatePassword(password) {
        // Al menos 8 caracteres, una letra mayúscula, una letra minúscula y un número
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/
        return re.test(password)
    }
    function validateForm() {
        if (!validateEmail(email)) {
            error('Por favor, ingresa un correo electrónico válido.')
            return false
        }
        if (!validatePassword(password)) {
            error('La contraseña debe tener al menos 8 caracteres, incluyendo una letra mayúscula, una letra minúscula y un número.')
            return false
        }
        return true
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
                customClass: {
                    popup: 'swal-popup',
                    title: 'swal-title',
                    text: 'swal-text',
                    confirmButton: 'swal-confirm-btn',
                },
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
            <div className="login-page">
                <div className="login-card" style={{ textAlign: 'center', padding: '2rem' }}>
                    Verificando sesión…
                </div>
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to={homePathForRole(authUser?.role)} replace />;
    }

    return (
        <div className="login-page">
        <div className="login-card">
            <div className="login-header">
                <div className="brand-icon">
                    <img src={Logo} alt="Logo H2O Manager" style={{height:'150px',marginBottom:'20px'}}/>
                </div>
                <p className="login-sub" style={{marginTop:'25px'}}>Ingresa tus credenciales para continuar</p>
            </div>

            {/* Form */}
            <form className="login-form">

            <div className="form-group">
                <label htmlFor="email">
                <FiMail className="label-icon" />
                Correo
                </label>
                <input
                id="email"
                type="email"
                maxLength={50}
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                />
            </div>

            <div className="form-group">
                <label htmlFor="password">
                <FiLock className="label-icon" />
                Contraseña
                </label>
                <div className="input-wrap">
                <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                    maxLength={15}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleSubmit();
                        }
                    }}
                />
                <button
                    type="button"
                    className="toggle-btn"
                    onClick={() => setShowPass(!showPassword)}
                    tabIndex={-1}
                    style={{height:'10px', width:'10px'}}
                    aria-label="Mostrar contraseña"
                >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
                </div>
            </div>

            <div className="form-meta">
                <a href="/" className="forgot" style={{ marginRight: '120px', padding: '5px 1px' }}>Volver </a>
                <a href="#" className="forgot" style={{ margin: '0 10px 0 0', padding: '5px 1px' }}>¿Olvidaste tu contraseña?</a>
            </div>

            <button type="submit" onClick={handleSubmit} className="btn-submit" disabled={isLoading}>
                {isLoading ? (
                <>
                    <span className="spinner" />
                    Iniciando sesión...
                </>
                ) : (
                <>
                    Ingresar al sistema
                    <FiArrowRight className="btn-arrow" />
                </>
                )}
            </button>

            </form>

            <p className="login-footer">
            © 2025 H2OManager · <a href="#">Soporte técnico</a>
            </p>

        </div>
        </div>
    )
}