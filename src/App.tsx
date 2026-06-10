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
import TedarikAnaliz from "./Sayfalar/TedarikAnaliz";
import TeslimEvraklari from "./Sayfalar/TeslimEvraklari";
import Fatura from "./Sayfalar/Fatura";
import Login from "./Sayfalar/Login";
import KullaniciYonetimi from "./Sayfalar/KullaniciYonetimi";

function getPermissions(): string[] {
    try {
        return JSON.parse(localStorage.getItem("permissions") || "[]");
    } catch {
        return [];
    }
}

function getRole(): string {
    return localStorage.getItem("role") || "kullanici";
}

function getDefaultPath(): string {
    const permissions = getPermissions();
    const role = getRole();

    if (role === "admin") return "/kullanici-yonetimi";
    if (permissions.includes("evrak")) return "/";
    if (permissions.includes("fatura")) return "/fatura";

    return "/login";
}

type ProtectedRouteProps = {
    children: React.ReactNode;
    permission?: string;
    role?: string;
};

function ProtectedRoute({ children, permission, role }: ProtectedRouteProps) {
    const kullaniciAdi = localStorage.getItem("kullaniciAdi");
    const permissions = getPermissions();
    const userRole = getRole();

    if (!kullaniciAdi) {
        return <Navigate to="/login" replace />;
    }

    if (role && userRole !== role) {
        return <Navigate to={getDefaultPath()} replace />;
    }

    if (permission && !permissions.includes(permission)) {
        return <Navigate to={getDefaultPath()} replace />;
    }

    return <>{children}</>;
}

function Layout() {
    const location = useLocation();
    const kullaniciAdi = localStorage.getItem("kullaniciAdi");

    const topbarGoster = location.pathname !== "/login" && !!kullaniciAdi;

    return (
        <>
            {topbarGoster && <Topbar />}

            <Routes>
                <Route
                    path="/login"
                    element={
                        kullaniciAdi ? (
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
                    path="/tedarik-analiz"
                    element={
                        <ProtectedRoute permission="evrak">
                            <TedarikAnaliz />
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
                    path="/kullanici-yonetimi"
                    element={
                        <ProtectedRoute role="admin">
                            <KullaniciYonetimi />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="*"
                    element={
                        <Navigate
                            to={kullaniciAdi ? getDefaultPath() : "/login"}
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