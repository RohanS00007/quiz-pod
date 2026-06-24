import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Hydrate from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (storedToken && storedUser) {
            try {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            } catch {
                // corrupted storage — clear it
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('user_role');
            }
        }
        setLoading(false);
    }, []);

    const login = (data) => {
        // data = { _id, name, email, role, rollNo, token }
        const { token: jwt, ...userData } = data;
        localStorage.setItem('token', jwt);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('user_role', userData.role); // keep for ProtectedRoute compat
        setToken(jwt);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('user_role');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}

export default AuthContext;
