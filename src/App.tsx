import React from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useLocation,
} from "react-router-dom";

import Topbar from "./Bilesenler/Topbar";
import TedarikAnaliz from "./Sayfalar/TedarikAnaliz";
import TeslimEvraklari from "./Sayfalar/TeslimEvraklari";
import Fatura from "./Sayfalar/Fatura";
import Karlilik from "./Sayfalar/karlilik";
import Login from "./Sayfalar/Login";
import KullaniciYonetimi from "./Sayfalar/KullaniciYonetimi";

function getPermissions(): string[] {
    try {
        const raw = JSON.parse(localStorage.getItem("permissions") || "[]");
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
}

function normalizeValue(value: unknown): string {
    return String(value || "").trim().toLowerCase();
}

function hasPermission(permissions: string[], ...keys: string[]): boolean {
    const normalizedPermissions = permissions.map(normalizeValue);
    return keys.some((key) => normalizedPermissions.includes(normalizeValue(key)));
}

function getRole(): string {
    return normalizeValue(localStorage.getItem("role") || "kullanici");
}

function getDefaultPath(): string {
    const permissions = getPermissions();
    const role = getRole();

    if (role === "admin") return "/kullanici-yonetimi";

    if (
        hasPermission(
            permissions,
            "tedarikAnaliz",
            "tedarik_analiz",
            "tedarik-analiz",
            "tedarik"
        )
    ) {
        return "/tedarik-analiz";
    }

    if (hasPermission(permissions, "evrak")) return "/teslim-evraklari";
    if (hasPermission(permissions, "fatura")) return "/fatura";
    if (hasPermission(permissions, "karlilik")) return "/karlilik";

    return "/login";
}

type ProtectedRouteProps = {
    children: React.ReactNode;
    permission?: string | string[];
    role?: string;
};

function ProtectedRoute({ children, permission, role }: ProtectedRouteProps) {
    const kullaniciAdi = localStorage.getItem("kullaniciAdi");
    const permissions = getPermissions();
    const userRole = getRole();

    if (!kullaniciAdi) {
        return <Navigate to="/login" replace />;
    }

    if (role && userRole !== normalizeValue(role)) {
        return <Navigate to={getDefaultPath()} replace />;
    }

    if (permission) {
        const permissionList = Array.isArray(permission) ? permission : [permission];

        if (!hasPermission(permissions, ...permissionList)) {
            return <Navigate to={getDefaultPath()} replace />;
        }
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
                    element={<Navigate to={getDefaultPath()} replace />}
                />

                <Route
                    path="/tedarik-analiz"
                    element={
                        <ProtectedRoute
                            permission={[
                                "tedarikAnaliz",
                                "tedarik_analiz",
                                "tedarik-analiz",
                                "tedarik",
                            ]}
                        >
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
                    path="/karlilik"
                    element={
                        <ProtectedRoute permission="karlilik">
                            <Karlilik />
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