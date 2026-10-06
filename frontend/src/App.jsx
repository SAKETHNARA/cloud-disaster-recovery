import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import PlaceholderPage from './pages/PlaceholderPage'
import { menuItems } from './menu'

function App() {
  return (
    <div className="layout">
      <Sidebar />

      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />

          {/* Every other menu item uses the placeholder page for now */}
          {menuItems
            .filter((item) => item.path !== '/')
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
  )
}

export default App