import { Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Backup from "./pages/Backup";
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
            <Route path="/" element={<Dashboard />} />

            {/* Real Backup page */}
            <Route path="/backup" element={<Backup />} />

            {/* Remaining pages are still placeholders */}
            {menuItems
              .filter(
                (item) =>
                  item.path !== "/" &&
                  item.path !== "/backup"
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
      {/* Public pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* All application pages require login */}
      <Route path="*" element={<ProtectedLayout />} />
    </Routes>
  );
}

export default App;