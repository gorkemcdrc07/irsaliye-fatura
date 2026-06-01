import React from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useLocation,
} from "react-router-dom";

import Topbar from "./Bilesenler/Topbar";
import AnaSayfa from "./Sayfalar/AnaSayfa";
import TeslimEvraklari from "./Sayfalar/TeslimEvraklari";
import Fatura from "./Sayfalar/Fatura";
import Login from "./Sayfalar/Login";

function getPermissions(): string[] {
    try {
        return JSON.parse(localStorage.getItem("permissions") || "[]");
    } catch {
        return [];
    }
}

function getDefaultPath(): string {
    const permissions = getPermissions();

    if (permissions.includes("evrak")) return "/";
    if (permissions.includes("fatura")) return "/fatura";

    return "/login";
}

type ProtectedRouteProps = {
    children: React.ReactNode;
    permission: string;
};

function ProtectedRoute({
    children,
    permission,
}: ProtectedRouteProps) {
    const token = localStorage.getItem("token");
    const permissions = getPermissions();

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (!permissions.includes(permission)) {
        return <Navigate to={getDefaultPath()} replace />;
    }

    return <>{children}</>;
}

function Layout() {
    const location = useLocation();
    const token = localStorage.getItem("token");

    const topbarGoster = location.pathname !== "/login" && !!token;

    return (
        <>
            {topbarGoster && <Topbar />}

            <Routes>
                <Route
                    path="/login"
                    element={
                        token ? (
                            <Navigate to={getDefaultPath()} replace />
                        ) : (
                            <Login />
                        )
                    }
                />

                <Route
                    path="/"
                    element={
                        <ProtectedRoute permission="evrak">
                            <AnaSayfa />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/teslim-evraklari"
                    element={
                        <ProtectedRoute permission="evrak">
                            <TeslimEvraklari />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/fatura"
                    element={
                        <ProtectedRoute permission="fatura">
                            <Fatura />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="*"
                    element={
                        <Navigate
                            to={token ? getDefaultPath() : "/login"}
                            replace
                        />
                    }
                />
            </Routes>
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Layout />
        </BrowserRouter>
    );
}

export default App;