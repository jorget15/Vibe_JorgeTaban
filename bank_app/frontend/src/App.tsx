import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Home from './pages/Home'
import About from './pages/About'
import SignIn from './pages/SignIn'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import Register from './pages/Register'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'

// Separated so useLocation can be called inside BrowserRouter
function AppContent() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')

  return (
    <div className="min-h-screen bg-citi-surface">
      {!isAdmin && <Navbar />}
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/about"     element={<About />} />
        <Route path="/signin"    element={<SignIn />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/register"  element={<Register />} />
        <Route path="/admin"     element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      </Routes>
      <ToastContainer position="top-right" theme="light" autoClose={3000} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
