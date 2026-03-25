/* App.tsx — root of the component tree.
   BrowserRouter enables URL-based navigation.
   Routes maps each URL path to a page component.
   Navbar sits outside Routes so it renders on every page. */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import About from './pages/About'
import SignIn from './pages/SignIn'
import Dashboard from './pages/Dashboard'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-citi-surface">
        <Navbar />
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/about"     element={<About />} />
          <Route path="/signin"    element={<SignIn />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
        {/* Toast notifications — position top-right, light theme to match the app */}
        <ToastContainer position="top-right" theme="light" autoClose={3000} />
      </div>
    </BrowserRouter>
  )
}

export default App
