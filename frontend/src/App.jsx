import { Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Backup from "./pages/Backup";
import BackupHistory from "./pages/BackupHistory";
import Disaster from "./pages/Disaster";
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

            {/* Dashboard */}
            <Route
              path="/"
              element={<Dashboard />}
            />

            {/* Backup Files */}
            <Route
              path="/backup"
              element={<Backup />}
            />

            {/* Backup History */}
            <Route
              path="/history"
              element={<BackupHistory />}
            />

            {/* Disaster Simulation */}
            <Route
              path="/disaster"
              element={<Disaster />}
            />

            {/* Remaining pages */}
            {menuItems
              .filter(
                (item) =>
                  item.path !== "/" &&
                  item.path !== "/backup" &&
                  item.path !== "/history" &&
                  item.path !== "/disaster"
              )
              .map((item) => (

                <Route
                  key={item.path}
                  path={item.path}
                  element={
                    <PlaceholderPage
                      icon={item.icon}
                      title={item.label}
                      description={item.description}
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

      {/* Public */}
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      {/* Protected application */}
      <Route
        path="*"
        element={<ProtectedLayout />}
      />

    </Routes>
  );
}


export default App;