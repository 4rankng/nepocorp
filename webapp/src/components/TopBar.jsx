import UserMenu from './UserMenu';
import logo from '../assets/logo.svg'; // Replace with actual logo path or use a placeholder

export default function TopBar({ user, onLogout }) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50 shadow-sm">
      <div className="flex items-center gap-2 sm:ml-0 ml-16">
        <a href="/" className="flex items-center gap-2">
          <img src={logo} alt="NePO Logo" className="h-8 w-8 object-contain" />
          <span className="font-bold text-lg tracking-wide text-blue-800">NePO Transport</span>
        </a>
      </div>
      <UserMenu user={user} onLogout={onLogout} />
    </header>
  );
}
