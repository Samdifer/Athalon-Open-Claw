import React from 'react';
import { motion } from 'framer-motion';
import { Home, Plane, Tool, ReceiptText, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Plane, label: 'Fleet', path: '/fleet' },
  { icon: Tool, label: 'Work Orders', path: '/work-orders' },
  { icon: ReceiptText, label: 'Billing', path: '/billing' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function AppDock() {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass rounded-full px-6 py-4 shadow-2xl flex items-center gap-6"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              relative group flex flex-col items-center transition-all duration-300
              ${isActive ? 'text-[#0066cc]' : 'text-zinc-500 hover:text-zinc-800'}
            `}
          >
            {({ isActive }) => (
              <>
                <motion.div
                  whileHover={{ scale: 1.2, y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <item.icon className="w-6 h-6" />
                </motion.div>
                {isActive && (
                  <motion.div 
                    layoutId="dock-indicator"
                    className="absolute -bottom-2 w-1 h-1 bg-[#0066cc] rounded-full"
                  />
                )}
                <span className="absolute -top-12 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </motion.div>
    </div>
  );
}
