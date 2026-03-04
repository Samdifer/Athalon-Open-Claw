import React from 'react';
import { motion } from 'framer-motion';
import { Plane, AlertCircle, CheckCircle2, Clock, Calendar } from 'lucide-react';

// Mock data for UI development
const fleetData = [
  { id: 1, tail: 'N7254G', model: 'Cessna 172S', status: 'AOG', hours: 2450.5, reason: 'Mag Drop', image: 'https://images.unsplash.com/photo-1559627687-f2b420f9d662?auto=format&fit=crop&q=80&w=800' },
  { id: 2, tail: 'N90823', model: 'Piper Archer', status: 'RTS', hours: 4102.1, nextInspection: '50hr', image: 'https://images.unsplash.com/photo-1464037866556-565499119518?auto=format&fit=crop&q=80&w=800' },
  { id: 3, tail: 'N5342K', model: 'Cessna 182T', status: 'WIP', hours: 1205.8, task: 'Annual', image: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&q=80&w=800' },
  { id: 4, tail: 'N123AB', model: 'Cirrus SR22', status: 'RTS', hours: 980.2, nextInspection: '100hr', image: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&q=80&w=800' },
  { id: 5, tail: 'N889WB', model: 'Diamond DA40', status: 'WIP', hours: 3100.4, task: '100hr', image: 'https://images.unsplash.com/photo-1520625981600-47b746864112?auto=format&fit=crop&q=80&w=800' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function Fleet() {
  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Fleet Command</h1>
          <p className="text-zinc-500 text-lg">5 active aircraft • 1 grounded</p>
        </div>
        <button className="bg-black text-white px-6 py-3 rounded-full font-medium hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl">
          Add Aircraft
        </button>
      </header>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Priority / Hero Card */}
        <motion.div variants={item} className="md:col-span-2 bento-card relative overflow-hidden group">
          <div className="absolute inset-0">
            <img src={fleetData[0].image} alt="Aircraft" className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>
          
          <div className="relative h-full flex flex-col justify-between text-white z-10 min-h-[300px]">
            <div className="flex justify-between items-start">
              <span className="bg-rose-500/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" /> AOG - Priority
              </span>
              <div className="p-2 bg-white/10 backdrop-blur-md rounded-full">
                <Plane className="w-5 h-5" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h2 className="text-5xl font-bold tracking-tight">{fleetData[0].tail}</h2>
                <p className="text-white/80 text-xl font-light">{fleetData[0].model}</p>
              </div>
              
              <div className="grid grid-cols-3 gap-4 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <div>
                  <p className="text-white/60 text-xs uppercase font-semibold">Reason</p>
                  <p className="font-medium">{fleetData[0].reason}</p>
                </div>
                <div>
                  <p className="text-white/60 text-xs uppercase font-semibold">Total Time</p>
                  <p className="font-medium">{fleetData[0].hours} hrs</p>
                </div>
                <div>
                  <p className="text-white/60 text-xs uppercase font-semibold">Est. RTS</p>
                  <p className="font-medium">Tomorrow</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Column */}
        <motion.div variants={item} className="space-y-6">
          <div className="bento-card bg-[#0066cc] text-white flex flex-col justify-between h-full min-h-[140px]">
             <div className="flex justify-between">
               <span className="text-blue-200 text-sm font-medium">Fleet Availability</span>
               <CheckCircle2 className="w-5 h-5 text-blue-200" />
             </div>
             <div>
               <p className="text-4xl font-semibold">80%</p>
               <p className="text-blue-200 text-sm mt-1">4 of 5 aircraft mission ready</p>
             </div>
          </div>
          
          <div className="bento-card flex flex-col justify-between h-full min-h-[140px]">
             <div className="flex justify-between">
               <span className="text-zinc-400 text-sm font-medium">Upcoming</span>
               <Calendar className="w-5 h-5 text-zinc-300" />
             </div>
             <div className="space-y-2">
               <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-orange-400" />
                 <p className="text-sm font-medium">N90823 - 50hr</p>
                 <span className="text-xs text-zinc-400 ml-auto">2 days</span>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-indigo-400" />
                 <p className="text-sm font-medium">N123AB - 100hr</p>
                 <span className="text-xs text-zinc-400 ml-auto">1 week</span>
               </div>
             </div>
          </div>
        </motion.div>

        {/* Remaining Fleet Grid */}
        {fleetData.slice(1).map((aircraft) => (
          <motion.div 
            key={aircraft.id}
            variants={item}
            className="bento-card hover:shadow-xl transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-8">
              <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-[#0066cc] group-hover:text-white transition-colors">
                <Plane className="w-6 h-6" />
              </div>
              <StatusBadge status={aircraft.status} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold">{aircraft.tail}</h3>
              <p className="text-zinc-500">{aircraft.model}</p>
            </div>
            
            <div className="mt-6 pt-6 border-t border-zinc-100 flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Clock className="w-4 h-4" />
                <span>{aircraft.hours} TT</span>
              </div>
              <span className="text-zinc-400 font-medium">
                {aircraft.task || aircraft.nextInspection || 'Ready'}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    AOG: 'bg-rose-50 text-rose-600',
    WIP: 'bg-orange-50 text-orange-600',
    RTS: 'bg-emerald-50 text-emerald-600',
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${styles[status as keyof typeof styles]}`}>
      {status}
    </span>
  );
}
