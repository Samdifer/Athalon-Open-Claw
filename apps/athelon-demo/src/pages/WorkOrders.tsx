import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tool, ChevronRight, CheckCircle2, AlertTriangle, Clock, X } from 'lucide-react';

const workOrders = [
  { id: 1, tail: 'N7254G', customer: 'John Doe', status: 'AOG', task: 'Magneto Inspection', progress: 30 },
  { id: 2, tail: 'N5342K', customer: 'Sarah Smith', status: 'WIP', task: 'Annual Inspection', progress: 65 },
  { id: 3, tail: 'N889WB', customer: 'Flight School A', status: 'WIP', task: '100hr Inspection', progress: 10 },
  { id: 4, tail: 'N123AB', customer: 'Tech Corp', status: 'RTS', task: 'Oil Change', progress: 100 },
];

export default function WorkOrders() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="space-y-8 relative">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Active Projects</h1>
        <p className="text-zinc-500 text-lg">Manage your shop floor flow.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workOrders.map((wo) => (
          <motion.div
            layoutId={`card-${wo.id}`}
            key={wo.id}
            onClick={() => setSelectedId(wo.id)}
            className="bento-card group cursor-pointer hover:shadow-xl relative"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 group-hover:bg-black group-hover:text-white transition-colors">
                <Tool className="w-5 h-5" />
              </div>
              <StatusPill status={wo.status} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold">{wo.tail}</h3>
              <p className="text-zinc-500">{wo.task}</p>
            </div>

            <div className="mt-8 space-y-2">
              <div className="flex justify-between text-xs font-medium text-zinc-400 uppercase tracking-wide">
                <span>Progress</span>
                <span>{wo.progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    wo.status === 'AOG' ? 'bg-rose-500' : 'bg-[#0066cc]'
                  }`} 
                  style={{ width: `${wo.progress}%` }} 
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(null)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
              <motion.div
                layoutId={`card-${selectedId}`}
                className="w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden pointer-events-auto flex flex-col md:flex-row h-[80vh]"
              >
                {/* Sidebar */}
                <div className="w-full md:w-1/3 bg-zinc-50 border-r border-zinc-100 p-8 flex flex-col">
                  <div className="flex justify-between items-center mb-8">
                     <h2 className="text-2xl font-bold">{workOrders.find(w => w.id === selectedId)?.tail}</h2>
                     <button 
                       onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
                       className="p-2 hover:bg-zinc-200 rounded-full transition-colors md:hidden"
                     >
                       <X className="w-5 h-5" />
                     </button>
                  </div>
                  
                  <div className="space-y-4 overflow-y-auto flex-1">
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-black/5 cursor-pointer ring-2 ring-[#0066cc]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-[#0066cc] uppercase">In Progress</span>
                      </div>
                      <p className="font-medium">Remove Cowling</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-black/5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-zinc-400 uppercase">Pending</span>
                      </div>
                      <p className="font-medium">Inspect Plugs</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-black/5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-zinc-400 uppercase">Pending</span>
                      </div>
                      <p className="font-medium">Compression Check</p>
                    </div>
                  </div>
                </div>

                {/* Main Canvas */}
                <div className="flex-1 p-8 md:p-12 relative flex flex-col">
                   <button 
                     onClick={() => setSelectedId(null)}
                     className="absolute top-8 right-8 p-2 hover:bg-zinc-100 rounded-full transition-colors hidden md:block"
                   >
                     <X className="w-6 h-6 text-zinc-400" />
                   </button>

                   <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 max-w-md mx-auto">
                     <div className="w-20 h-20 bg-blue-50 text-[#0066cc] rounded-full flex items-center justify-center">
                       <Tool className="w-8 h-8" />
                     </div>
                     <h3 className="text-3xl font-semibold">Remove Cowling</h3>
                     <p className="text-zinc-500 text-lg">
                       Ensure all fasteners are bagged and tagged. Inspect for oil leaks immediately upon removal.
                     </p>
                     
                     <div className="pt-8 w-full space-y-4">
                       <button className="w-full py-4 bg-black text-white rounded-2xl font-medium text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-xl">
                         Mark Complete
                       </button>
                       <button className="w-full py-4 bg-white border border-zinc-200 text-zinc-600 rounded-2xl font-medium text-lg hover:bg-zinc-50 transition-colors">
                         Report Issue
                       </button>
                     </div>
                   </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles = {
    AOG: 'bg-rose-100 text-rose-700',
    WIP: 'bg-orange-100 text-orange-700',
    RTS: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${styles[status as keyof typeof styles]}`}>
      {status}
    </span>
  );
}
