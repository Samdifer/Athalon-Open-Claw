import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, X, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useQuery } from "convex/react";
import { api } from "../../../athelon-app/convex/_generated/api";
import { useOrgContext } from "../providers/OrgContextProvider";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function WorkOrders() {
  const { orgId, isLoaded: orgLoaded } = useOrgContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeOrders = useQuery(api.workOrders.listActive, orgLoaded && orgId ? { organizationId: orgId, limit: 20 } : "skip");
  const selectedOrderDetails = useQuery(api.workOrders.getWorkOrder, orgLoaded && orgId && selectedId ? { 
    workOrderId: selectedId as any, 
    organizationId: orgId 
  } : "skip");

  if (!orgLoaded || activeOrders === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-12 h-12 rounded-full bg-zinc-200" 
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Active Projects</h1>
        <p className="text-zinc-500 text-lg">{activeOrders.length} projects currently on the floor.</p>
      </header>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {activeOrders.map((wo) => (
          <motion.div
            layoutId={`card-${wo._id}`}
            key={wo._id}
            onClick={() => setSelectedId(wo._id)}
            className="bento-card group cursor-pointer hover:shadow-xl relative"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 group-hover:bg-black group-hover:text-white transition-colors">
                <Wrench className="w-5 h-5" />
              </div>
              <StatusPill status={wo.status} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold">{wo.aircraft?.currentRegistration ?? 'N/A'}</h3>
              <p className="text-zinc-500 line-clamp-1">{wo.description}</p>
            </div>

            <div className="mt-8 space-y-2">
              <div className="flex justify-between text-xs font-medium text-zinc-400 uppercase tracking-wide">
                <span>{wo.workOrderNumber}</span>
                <span>{new Date(wo.openedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

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
                className="w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden pointer-events-auto flex flex-col md:flex-row h-[85vh]"
              >
                {/* Sidebar */}
                <div className="w-full md:w-1/3 bg-zinc-50 border-r border-zinc-100 p-8 flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center mb-8">
                     <div>
                       <h2 className="text-2xl font-bold">{selectedOrderDetails?.aircraft?.currentRegistration}</h2>
                       <p className="text-sm text-zinc-400">{selectedOrderDetails?.workOrder.workOrderNumber}</p>
                     </div>
                     <button 
                       onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
                       className="p-2 hover:bg-zinc-200 rounded-full transition-colors md:hidden"
                     >
                       <X className="w-5 h-5" />
                     </button>
                  </div>
                  
                  <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">Task Cards</h4>
                    {selectedOrderDetails?.taskCards.map((tc) => (
                      <div 
                        key={tc._id}
                        className={`p-4 bg-white rounded-2xl shadow-sm border border-black/5 cursor-pointer transition-all ${
                          tc.status === 'complete' ? 'opacity-50' : 'ring-2 ring-black/5 hover:ring-[#0066cc]/30'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[10px] font-bold uppercase ${
                            tc.status === 'complete' ? 'text-emerald-500' : 'text-[#0066cc]'
                          }`}>
                            {tc.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="font-medium text-sm">{tc.title}</p>
                      </div>
                    ))}
                    
                    {selectedOrderDetails?.discrepancies.length! > 0 && (
                      <>
                        <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest px-1 mt-6">Squawks</h4>
                        {selectedOrderDetails?.discrepancies.map((d) => (
                          <div key={d._id} className="p-4 bg-rose-50/30 rounded-2xl border border-rose-100">
                            <p className="text-sm font-medium text-rose-900">{d.description}</p>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Main Canvas */}
                <div className="flex-1 p-8 md:p-12 relative flex flex-col overflow-y-auto">
                   <button 
                     onClick={() => setSelectedId(null)}
                     className="absolute top-8 right-8 p-2 hover:bg-zinc-100 rounded-full transition-colors hidden md:block z-10"
                   >
                     <X className="w-6 h-6 text-zinc-400" />
                   </button>

                   {!selectedOrderDetails ? (
                     <div className="flex-1 flex items-center justify-center">
                       <div className="animate-pulse w-8 h-8 rounded-full bg-zinc-100" />
                     </div>
                   ) : (
                     <div className="space-y-12">
                       <section className="space-y-4">
                         <div className="flex items-center gap-3 text-[#0066cc]">
                           <Wrench className="w-5 h-5" />
                           <span className="font-semibold uppercase tracking-wider text-xs">Work Order Overview</span>
                         </div>
                         <h3 className="text-4xl font-semibold leading-tight">{selectedOrderDetails.workOrder.description}</h3>
                         <div className="flex gap-8 pt-4">
                            <div>
                              <p className="text-zinc-400 text-xs font-bold uppercase">Customer</p>
                              <p className="font-medium">Direct Billing</p>
                            </div>
                            <div>
                              <p className="text-zinc-400 text-xs font-bold uppercase">Aircraft TT</p>
                              <p className="font-medium">{selectedOrderDetails.aircraft?.totalTimeAirframeHours.toFixed(1)} hrs</p>
                            </div>
                         </div>
                       </section>

                       <section className="space-y-6">
                         <div className="grid grid-cols-2 gap-6">
                            <div className="bento-card bg-zinc-50 p-6 flex flex-col justify-between min-h-[140px]">
                              <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                              <div>
                                <p className="text-2xl font-bold">{selectedOrderDetails.taskCards.filter(t => t.status === 'complete').length}</p>
                                <p className="text-xs text-zinc-400 font-bold uppercase">Tasks Completed</p>
                              </div>
                            </div>
                            <div className="bento-card bg-zinc-50 p-6 flex flex-col justify-between min-h-[140px]">
                              <AlertCircle className="text-rose-500 w-6 h-6" />
                              <div>
                                <p className="text-2xl font-bold">{selectedOrderDetails.discrepancies.length}</p>
                                <p className="text-xs text-zinc-400 font-bold uppercase">Open Squawks</p>
                              </div>
                            </div>
                         </div>
                       </section>

                       <div className="pt-12 border-t border-zinc-100 flex justify-between items-center">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Return to Service</p>
                            <p className="text-xs text-zinc-400">
                              {selectedOrderDetails.workOrder.returnedToService ? 'Certified' : 'Pending Authorization'}
                            </p>
                          </div>
                          <button className="px-8 py-3 bg-black text-white rounded-full font-medium shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                            {selectedOrderDetails.workOrder.returnedToService ? 'View RTS' : 'Authorize RTS'}
                          </button>
                       </div>
                     </div>
                   )}
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
  const styles: any = {
    open: 'bg-zinc-100 text-zinc-600',
    in_progress: 'bg-blue-100 text-[#0066cc]',
    on_hold: 'bg-orange-100 text-orange-700',
    pending_inspection: 'bg-purple-100 text-purple-700',
    pending_signoff: 'bg-indigo-100 text-indigo-700',
    closed: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${styles[status] ?? styles.open}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
