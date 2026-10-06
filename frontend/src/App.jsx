import { Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Backup from "./pages/Backup";
import BackupHistory from "./pages/BackupHistory";
import Disaster from "./pages/Disaster";
import Restore from "./pages/Restore";
import RecoveryHistory from "./pages/RecoveryHistory";
import SystemStatus from "./pages/SystemStatus";
import CloudStorage from "./pages/CloudStorage";
import PlaceholderPage from "./pages/PlaceholderPage";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./pages/ProtectedRoute";

import { menuItems } from "./menu";


function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <div className="layout">

        <Sidebar />

        <main className="content">

          <Routes>

            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/backup"
              element={<Backup />}
            />

            <Route
              path="/history"
              element={<BackupHistory />}
            />

            <Route
              path="/disaster"
              element={<Disaster />}
            />

            <Route
              path="/restore"
              element={<Restore />}
            />

            <Route
              path="/recovery-history"
              element={<RecoveryHistory />}
            />

            <Route
              path="/status"
              element={<SystemStatus />}
            />

            <Route
              path="/storage"
              element={<CloudStorage />}
            />

            {menuItems
              .filter(
                (item) =>
                  item.path !== "/" &&
                  item.path !== "/backup" &&
                  item.path !== "/history" &&
                  item.path !== "/disaster" &&
                  item.path !== "/restore" &&
                  item.path !== "/recovery-history" &&
                  item.path !== "/status" &&
                  item.path !== "/storage"
              )
              .map((item) => (
                <Route
                  key={item.path}
                  path={item.path}
                  element={
                    <PlaceholderPage
                      icon={item.icon}
                      title={item.label}
                      description={
                        item.description
                      }
                      phase={item.phase}
                    />
                  }
                />
              ))}

          </Routes>

        </main>

      </div>
    </ProtectedRoute>
  );
}


function App() {
  return (
    <Routes>

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="*"
        element={<ProtectedLayout />}
      />

    </Routes>
  );
}


export default App;