import { Outlet } from 'react-router'
import NavBar from './NavBar.jsx'
import './Layout.css'

// The frame around every page. <Outlet /> is where React Router renders the
// page matched by the current URL (see the nested routes in App.jsx).
export default function Layout() {
  return (
    <>
      <NavBar />
      <main className="layout__main container">
        <Outlet />
      </main>
    </>
  )
}
