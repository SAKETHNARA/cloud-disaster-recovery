import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
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
            <Route path="/" element={<Dashboard />} />

            {menuItems
              .filter((item) => item.path !== "/")
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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="*" element={<ProtectedLayout />} />
    </Routes>
  );
}

export default App;