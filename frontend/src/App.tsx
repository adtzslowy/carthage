import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DockerPage from "./pages/DockerPage";
import ServerMonitoring from "./pages/ServerMonitoring";
import DockerImagesPage from "./pages/DockerImagesPage";

export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/dashboard/docker" element={<DockerPage />} />

          <Route path="/dashboard/monitoring" element={<ServerMonitoring />} />
          <Route
            path="/dashboard/docker/images"
            element={<DockerImagesPage />}
          />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
