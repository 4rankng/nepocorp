// import { useState } from 'react'; // Removed useState
import UserMenu from './UserMenu';
import logo from '../assets/logo.svg'; // Replace with actual logo path or use a placeholder

export default function TopBar({ user, onLogout, isMobileMenuOpen, onToggleMenu }) {
  // const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Removed local state

  // const handleToggleMenu = () => { // Simplified: directly use onToggleMenu from props
  //   setIsMobileMenuOpen(!isMobileMenuOpen);
  //   if (onToggleMenu) {
  //     onToggleMenu();
  //   }
  // };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          className="sm:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none mr-2"
          onClick={onToggleMenu} // Use onToggleMenu from props
        >
          <svg
            className="h-6 w-6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isMobileMenuOpen ? ( // Use isMobileMenuOpen from props
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        <a href="/" className="flex items-center gap-2">
          <img src={logo} alt="NePO Logo" className="h-8 w-8 object-contain" />
          <span className="font-bold text-lg tracking-wide text-blue-800">NePO Transport</span>
        </a>
      </div>
      <UserMenu user={user} onLogout={onLogout} />
    </header>
  );
}
