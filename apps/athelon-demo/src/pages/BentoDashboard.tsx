import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Plane, Wrench, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react';
import { useQuery } from "convex/react";
import { api } from "../../../athelon-app/convex/_generated/api";
import { useOrgContext } from "../providers/OrgContextProvider";

export default function BentoDashboard() {
  const { orgId, isLoaded: orgLoaded } = useOrgContext();
  
  const fleet = useQuery(api.aircraft.list, orgLoaded && orgId ? { organizationId: orgId } : "skip");
  const activeCount = useQuery(api.workOrders.countActive, orgLoaded && orgId ? { organizationId: orgId } : "skip");
  const activeOrders = useQuery(api.workOrders.listActive, orgLoaded && orgId ? { organizationId: orgId, limit: 3 } : "skip");

  if (!orgLoaded || fleet === undefined || activeCount === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex gap-2">
           {[0, 1, 2].map(i => (
             <motion.div 
               key={i}
               animate={{ y: [0, -10, 0] }}
               transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
               className="w-3 h-3 rounded-full bg-zinc-200" 
             />
           ))}
        </div>
      </div>
    );
  }

  const aogCount = fleet.filter(ac => ac.openWorkOrderCount > 0).length;
  const readyCount = fleet.length - aogCount;
  const availability = fleet.length > 0 ? Math.round((readyCount / fleet.length) * 100) : 100;

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  };

  const item = {
    hidden: { y: 30, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 20 } }
  };

  return (
    <div className="space-y-12 pb-20">
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <motion.h1 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="text-5xl font-semibold tracking-tight"
          >
            Athalon Hub
          </motion.h1>
          <motion.p 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-500 text-lg font-medium"
          >
            {availability}% Mission Readiness
          </motion.p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 bg-white/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-black/5 shadow-apple-sm"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Live System</span>
        </motion.div>
      </header>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-6"
      >
        {/* Fleet Matrix - Large 2x2 Bento */}
        <motion.div 
          variants={item}
          className="md:col-span-2 md:row-span-2 bento-card flex flex-col justify-between group"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="text-xl font-medium">Fleet Matrix</h3>
              <p className="text-sm text-zinc-400">High-density health tracking</p>
            </div>
            <Plane className="text-zinc-200 w-10 h-10 group-hover:text-[#0066cc] group-hover:scale-110 transition-all duration-500" />
          </div>
          
          <div className="flex-1 flex items-center justify-center py-12">
             <div className="relative">
                {/* SVG Activity Rings */}
                <svg className="w-48 h-48 -rotate-90">
                   <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-zinc-50" />
                   <motion.circle 
                     cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" 
                     strokeDasharray={2 * Math.PI * 80}
                     initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
                     animate={{ strokeDashoffset: (2 * Math.PI * 80) * (1 - availability/100) }}
                     transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                     className="text-[#0066cc]" 
                   />
                   
                   <circle cx="96" cy="96" r="64" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-zinc-50" />
                   <motion.circle 
                     cx="96" cy="96" r="64" stroke="currentColor" strokeWidth="12" fill="transparent" 
                     strokeDasharray={2 * Math.PI * 64}
                     initial={{ strokeDashoffset: 2 * Math.PI * 64 }}
                     animate={{ strokeDashoffset: (2 * Math.PI * 64) * (1 - (readyCount/fleet.length || 0)) }}
                     transition={{ duration: 1.5, ease: "easeOut", delay: 0.7 }}
                     className="text-emerald-500" 
                   />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <p className="text-4xl font-bold tracking-tight">{availability}%</p>
                   <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Global</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-50">
             <div className="space-y-1">
               <p className="text-2xl font-semibold">{readyCount}</p>
               <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Airworthy</p>
             </div>
             <div className="space-y-1">
               <p className="text-2xl font-semibold">{aogCount}</p>
               <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Grounding</p>
             </div>
          </div>
        </motion.div>

        {/* Work Order Momentum - 2x1 Bento */}
        <motion.div 
          variants={item}
          className="md:col-span-2 bento-card flex flex-col justify-between group cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="text-xl font-medium">Shop Momentum</h3>
              <p className="text-sm text-zinc-400">{activeCount} active projects</p>
            </div>
            <div className="bg-zinc-50 p-2 rounded-xl group-hover:bg-[#0066cc] group-hover:text-white transition-colors">
               <Wrench className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 h-12">
             {activeOrders?.map((wo, i) => (
                <motion.div 
                  key={wo._id}
                  whileHover={{ scale: 1.1, y: -5 }}
                  className="h-full flex-1 bg-zinc-50 rounded-xl border border-black/5 flex items-center justify-center text-[10px] font-bold text-zinc-400 group-hover:border-[#0066cc]/20 transition-all"
                >
                   {wo.aircraft?.currentRegistration?.substring(0, 3)}
                </motion.div>
             ))}
             <div className="h-full aspect-square bg-zinc-100 rounded-xl flex items-center justify-center text-[10px] font-bold text-zinc-500">
                +{activeCount! - activeOrders?.length!}
             </div>
          </div>
        </motion.div>

        {/* Financial Pulse - 1x1 Bento */}
        <motion.div 
          variants={item}
          className="bento-card flex flex-col justify-between overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-4">
             <TrendingUp className="text-emerald-500 w-5 h-5" />
          </div>
          <div className="space-y-1 z-10">
            <p className="text-2xl font-semibold">$124.8k</p>
            <p className="text-xs text-zinc-400 font-medium">Monthly Revenue</p>
          </div>
          <div className="h-12 w-full flex items-end gap-1 px-1">
             {[0.4, 0.6, 0.5, 0.8, 0.7, 0.9, 0.8].map((h, i) => (
               <div 
                 key={i} 
                 style={{ height: `${h * 100}%` }} 
                 className="flex-1 bg-emerald-100 rounded-t-sm" 
               />
             ))}
          </div>
        </motion.div>

        {/* Priority Alerts - 1x1 Bento */}
        <motion.div 
          variants={item}
          className={`bento-card flex flex-col justify-between transition-all ${aogCount > 0 ? 'bg-rose-500 text-white shadow-rose-200' : ''}`}
        >
          <div className="flex justify-between items-start">
            <AlertTriangle className={`${aogCount > 0 ? 'text-white' : 'text-zinc-300'} w-6 h-6`} />
            <ChevronRight className={`w-4 h-4 ${aogCount > 0 ? 'text-white/60' : 'text-zinc-300'}`} />
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold">{aogCount}</p>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${aogCount > 0 ? 'text-white/80' : 'text-zinc-400'}`}>
              Urgent Grounds
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Activity Log */}
      <section className="space-y-6">
        <h2 className="text-2xl font-medium tracking-tight">System Logs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activeOrders?.map((wo, i) => (
            <motion.div
              key={wo._id}
              variants={item}
              className="bg-white rounded-4xl p-6 shadow-apple-sm border border-black/[0.02] flex gap-4 items-center hover:shadow-apple-md transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#f2f2f7] flex items-center justify-center group-hover:bg-[#0066cc]/10 transition-colors">
                <Activity className="w-5 h-5 text-zinc-400 group-hover:text-[#0066cc]" />
              </div>
              <div className="space-y-1 overflow-hidden">
                <p className="text-sm font-semibold text-zinc-800 truncate">{wo.aircraft?.currentRegistration}</p>
                <p className="text-xs text-zinc-400 font-medium truncate">{wo.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
