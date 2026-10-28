import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <NavLink to="/" end className="nav-link" aria-label="Dashboard">
          Dashboard
        </NavLink>
        <NavLink to="/discover" end className="nav-link" aria-label="Discover">
          Discover
        </NavLink>
        <NavLink to="/create" end className="nav-link" aria-label="Create Reel">
          Create Reel
        </NavLink>
        <NavLink to="/projects" end className="nav-link" aria-label="Projects">
          Projects
        </NavLink>
        <NavLink to="/settings" end className="nav-link" aria-label="Settings">
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}
