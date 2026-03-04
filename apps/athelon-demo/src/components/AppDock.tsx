import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Home, Plane, Wrench, ReceiptText, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Plane, label: 'Fleet', path: '/fleet' },
  { icon: Wrench, label: 'Work Orders', path: '/work-orders' },
  { icon: ReceiptText, label: 'Billing', path: '/billing' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function AppDock() {
  const mouseX = useMotionValue(Infinity);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <motion.div 
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="glass rounded-full px-6 py-4 flex items-center gap-6"
      >
        {navItems.map((item) => (
          <DockIcon 
            key={item.path} 
            mouseX={mouseX} 
            icon={item.icon} 
            label={item.label} 
            path={item.path} 
          />
        ))}
      </motion.div>
    </div>
  );
}

function DockIcon({ mouseX, icon: Icon, label, path }: any) {
  const ref = useRef<HTMLAnchorElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [40, 72, 40]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

  return (
    <NavLink
      ref={ref}
      to={path}
      className={({ isActive }) => `
        relative group flex flex-col items-center
        ${isActive ? 'text-[#0066cc]' : 'text-zinc-500 hover:text-zinc-800'}
      `}
    >
      {({ isActive }) => (
        <>
          <motion.div
            style={{ width }}
            className="aspect-square rounded-2xl flex items-center justify-center relative transition-colors"
          >
             <Icon className="w-[60%] h-[60%]" />
          </motion.div>
          
          {isActive && (
            <motion.div 
              layoutId="dock-indicator"
              className="absolute -bottom-2 w-1 h-1 bg-[#0066cc] rounded-full"
            />
          )}
          
          <span className="absolute -top-12 bg-black/80 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}
