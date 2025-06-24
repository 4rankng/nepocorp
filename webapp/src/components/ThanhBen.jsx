import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMenuItems } from '@/config/roles';
import {
  ChartBarIcon,
  CalendarIcon,
  UsersIcon,
  ChainLinkIcon,
  BriefcaseIcon,
  TruckIcon,
  Cog8ToothIcon,
  DocumentTextIcon,
  OilIcon,
  TireIcon
} from '@assets/icons';

// Icon mapping
const iconComponents = {
  ChartBar: ChartBarIcon,
  Calendar: CalendarIcon,
  Users: UsersIcon,
  ChainLink: ChainLinkIcon,
  Briefcase: BriefcaseIcon,
  Truck: TruckIcon,
  Cog8Tooth: Cog8ToothIcon,
  DocumentText: DocumentTextIcon,
  Oil: OilIcon,
  Tire: TireIcon,
};

const ThanhBen = ({ onNavItemClick }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  
  if (!currentUser) return null;

  const menuSections = getMenuItems(currentUser.role);

  return (
    <aside 
      className="w-64 h-full overflow-y-auto"
      style={{
        background: '#ffffff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <nav className="pt-6">
        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-8">
            {/* Section Title */}
            <div 
              className="px-6 mb-3"
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#8e8e93',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {section.sectionTitle}
            </div>
            
            {/* Section Items */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const IconComponent = iconComponents[item.icon];
                const isActive = location.pathname.startsWith(item.href);
                
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className="group flex items-center px-6 py-3 text-base font-medium transition-all duration-200 ease-in-out relative hover:bg-gray-50 hover:text-blue-600 hover:translate-x-1"
                    style={{
                      color: isActive ? '#2a5298' : '#4a4a4a',
                      backgroundColor: isActive ? '#e8f0fe' : 'transparent',
                      borderLeft: isActive ? '4px solid #2a5298' : '4px solid transparent',
                    }}
                    onClick={() => {
                      if (onNavItemClick) {
                        onNavItemClick();
                      }
                    }}
                  >
                    {/* Icon */}
                    <span className="mr-3 transition-all duration-300 group-hover:scale-105">
                      {IconComponent && (
                        <IconComponent 
                          className="w-5 h-5"
                          style={{ opacity: 0.8 }}
                        />
                      )}
                    </span>
                    
                    {/* Label */}
                    <span 
                      className="relative z-10"
                      style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        letterSpacing: '0.025em',
                      }}
                    >
                      {item.name}
                    </span>
                    
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default ThanhBen;