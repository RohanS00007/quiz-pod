import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ element, requiredRole }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('user_role');

    if (!token || (requiredRole && role !== requiredRole)) {
        return <Navigate to="/auth" replace />;
    }

    return element;
};

export default ProtectedRoute;
