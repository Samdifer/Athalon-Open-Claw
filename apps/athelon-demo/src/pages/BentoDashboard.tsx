import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Plane, Tool, TrendingUp, AlertTriangle } from 'lucide-react';

export default function BentoDashboard() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Welcome back, Sam.</h1>
        <p className="text-zinc-500 text-lg">Your hangar is at 84% capacity today.</p>
      </header>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-6"
      >
        {/* Fleet Health - Large 2x2 Bento */}
        <motion.div 
          variants={item}
          className="md:col-span-2 md:row-span-2 bento-card flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="text-xl font-medium">Fleet Health</h3>
              <p className="text-sm text-zinc-400">Current fleet status and upcoming ADs</p>
            </div>
            <Plane className="text-zinc-300 w-8 h-8" />
          </div>
          <div className="space-y-6 mt-12">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-50 space-y-2 border border-black/5">
                <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Active</span>
                <p className="text-3xl font-medium">12</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-50 space-y-2 border border-black/5">
                <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">AOG</span>
                <p className="text-3xl font-medium text-rose-500">2</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Scheduled Inspections</span>
                <span className="font-medium text-[#0066cc]">85% Compliant</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "85%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-[#0066cc]"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Work Orders - 2x1 Bento */}
        <motion.div 
          variants={item}
          className="md:col-span-2 bento-card flex justify-between items-center group cursor-pointer hover:shadow-xl transition-all"
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-medium">Active Work Orders</h3>
              <p className="text-sm text-zinc-400">14 projects in progress</p>
            </div>
            <div className="flex -space-x-2">
              {[1,2,3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-[10px] font-bold">
                  JS
                </div>
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-white bg-zinc-200 flex items-center justify-center text-[10px] font-bold">
                +11
              </div>
            </div>
          </div>
          <div className="bg-[#f2f2f7] p-4 rounded-3xl group-hover:bg-[#0066cc] group-hover:text-white transition-colors">
            <Tool className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Financials - 1x1 Bento */}
        <motion.div 
          variants={item}
          className="bento-card flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <TrendingUp className="text-emerald-500 w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-semibold">$142.5k</p>
            <p className="text-xs text-zinc-400">Monthly Revenue</p>
          </div>
        </motion.div>

        {/* Warnings/Squawks - 1x1 Bento */}
        <motion.div 
          variants={item}
          className="bento-card flex flex-col justify-between bg-[#fff2f2] border border-rose-100"
        >
          <div className="flex justify-between items-start">
            <AlertTriangle className="text-rose-500 w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-semibold text-rose-600">4</p>
            <p className="text-xs text-rose-400">Critical Squawks</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Secondary Row: Live Feed / Activity */}
      <section className="space-y-6">
        <h2 className="text-2xl font-medium tracking-tight">Recent Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              variants={item}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.5 + (i * 0.1) }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-black/5 flex gap-4 items-center"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#f2f2f7] flex items-center justify-center">
                <Activity className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-zinc-800">N123AB Inspection Signed</p>
                <p className="text-xs text-zinc-400">2 hours ago • Technician Dave</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
