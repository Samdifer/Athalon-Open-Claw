import React from 'react';
import { motion } from 'framer-motion';
import { Plane, AlertCircle, CheckCircle2, Clock, Calendar } from 'lucide-react';
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

export default function Fleet() {
  const { orgId, isLoaded: orgLoaded } = useOrgContext();
  const fleetData = useQuery(api.aircraft.list, orgLoaded && orgId ? { organizationId: orgId } : "skip");

  if (!orgLoaded || fleetData === undefined) {
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

  const sortedFleet = [...(fleetData ?? [])].sort((a, b) => b.openWorkOrderCount - a.openWorkOrderCount);
  const heroAircraft = sortedFleet[0];
  const remainingFleet = sortedFleet.slice(1);
  
  const aogCount = fleetData.filter(ac => ac.openWorkOrderCount > 0).length;
  const readyCount = fleetData.length - aogCount;
  const availability = fleetData.length > 0 ? Math.round((readyCount / fleetData.length) * 100) : 100;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Fleet Command</h1>
          <p className="text-zinc-500 text-lg">{fleetData.length} active aircraft • {aogCount} with open orders</p>
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
        {heroAircraft && (
          <motion.div variants={item} className="md:col-span-2 bento-card relative overflow-hidden group min-h-[400px]">
            <div className="absolute inset-0">
              {heroAircraft.featuredImageUrl ? (
                <img src={heroAircraft.featuredImageUrl} alt="Aircraft" className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full bg-zinc-100 flex items-center justify-center">
                   <Plane className="w-24 h-24 text-zinc-200" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </div>
            
            <div className="relative h-full flex flex-col justify-between text-white z-10 p-8">
              <div className="flex justify-between items-start">
                <span className={`backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-1.5 ${
                  heroAircraft.openWorkOrderCount > 0 ? 'bg-rose-500/90' : 'bg-emerald-500/90'
                }`}>
                  {heroAircraft.openWorkOrderCount > 0 ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  {heroAircraft.openWorkOrderCount > 0 ? 'Action Required' : 'Ready for Flight'}
                </span>
                <div className="p-2 bg-white/10 backdrop-blur-md rounded-full">
                  <Plane className="w-5 h-5" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h2 className="text-5xl font-bold tracking-tight">{heroAircraft.currentRegistration}</h2>
                  <p className="text-white/80 text-xl font-light">{heroAircraft.make} {heroAircraft.model}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                  <div>
                    <p className="text-white/60 text-xs uppercase font-semibold">Orders</p>
                    <p className="font-medium">{heroAircraft.openWorkOrderCount}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs uppercase font-semibold">Total Time</p>
                    <p className="font-medium">{heroAircraft.totalTimeAirframeHours.toFixed(1)} hrs</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs uppercase font-semibold">Next Inspec</p>
                    <p className="font-medium">
                      {heroAircraft.nextScheduledStartDate 
                        ? new Date(heroAircraft.nextScheduledStartDate).toLocaleDateString()
                        : 'None'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Column */}
        <motion.div variants={item} className="space-y-6">
          <div className="bento-card bg-[#0066cc] text-white flex flex-col justify-between h-full min-h-[160px]">
             <div className="flex justify-between">
               <span className="text-blue-200 text-sm font-medium">Fleet Availability</span>
               <CheckCircle2 className="w-5 h-5 text-blue-200" />
             </div>
             <div>
               <p className="text-4xl font-semibold">{availability}%</p>
               <p className="text-blue-200 text-sm mt-1">{readyCount} of {fleetData.length} mission ready</p>
             </div>
          </div>
          
          <div className="bento-card flex flex-col justify-between h-full min-h-[160px]">
             <div className="flex justify-between">
               <span className="text-zinc-400 text-sm font-medium">Recently Updated</span>
               <Calendar className="w-5 h-5 text-zinc-300" />
             </div>
             <div className="space-y-3">
               {fleetData.slice(0, 3).map((ac) => (
                 <div key={ac._id} className="flex items-center gap-3">
                   <div className={`w-2 h-2 rounded-full ${ac.openWorkOrderCount > 0 ? 'bg-orange-400' : 'bg-emerald-400'}`} />
                   <p className="text-sm font-medium">{ac.currentRegistration}</p>
                   <span className="text-xs text-zinc-400 ml-auto">
                     {new Date(ac.updatedAt).toLocaleDateString()}
                   </span>
                 </div>
               ))}
             </div>
          </div>
        </motion.div>

        {/* Remaining Fleet Grid */}
        {remainingFleet.map((aircraft) => (
          <motion.div 
            key={aircraft._id}
            variants={item}
            className="bento-card hover:shadow-xl transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-8">
              <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-[#0066cc] group-hover:text-white transition-colors">
                <Plane className="w-6 h-6" />
              </div>
              <StatusBadge status={aircraft.openWorkOrderCount > 0 ? 'WIP' : 'RTS'} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold">{aircraft.currentRegistration}</h3>
              <p className="text-zinc-500">{aircraft.make} {aircraft.model}</p>
            </div>
            
            <div className="mt-6 pt-6 border-t border-zinc-100 flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Clock className="w-4 h-4" />
                <span>{aircraft.totalTimeAirframeHours.toFixed(1)} hrs</span>
              </div>
              <span className="text-zinc-400 font-medium">
                {aircraft.openWorkOrderCount > 0 ? `${aircraft.openWorkOrderCount} open orders` : 'Ready'}
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
