import { Link, NavLink } from 'react-router'
import './NavBar.css'

export default function NavBar() {
  return (
    <header className="navbar">
      <nav className="navbar__inner container" aria-label="Main">
        <Link to="/" className="navbar__brand">
          Reading List
        </Link>
        <ul className="navbar__links">
          <li>
            {/* NavLink adds the "active" class when its URL matches. `end`
                stops "/" from matching every URL that starts with "/". */}
            <NavLink to="/" end className="navbar__link">
              Books
            </NavLink>
          </li>
          <li>
            <NavLink to="/genres" className="navbar__link">
              Genres
            </NavLink>
          </li>
        </ul>
      </nav>
    </header>
  )
}
