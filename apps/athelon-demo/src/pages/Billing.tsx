import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Receipt, CreditCard, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';

// Mock data for charts and lists
const revenueData = [
  { day: 'Mon', value: 4200 },
  { day: 'Tue', value: 5800 },
  { day: 'Wed', value: 3900 },
  { day: 'Thu', value: 8100 },
  { day: 'Fri', value: 6500 },
  { day: 'Sat', value: 2100 },
  { day: 'Sun', value: 0 },
];

const invoices = [
  { id: 'INV-2024-001', customer: 'John Doe', amount: 2450.00, status: 'Overdue', due: '2 days ago' },
  { id: 'INV-2024-002', customer: 'Flight School A', amount: 12800.50, status: 'Sent', due: 'Due tomorrow' },
  { id: 'INV-2024-003', customer: 'Tech Corp', amount: 450.00, status: 'Paid', due: 'Paid today' },
  { id: 'INV-2024-004', customer: 'Sarah Smith', amount: 3100.25, status: 'Draft', due: 'Draft' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function Billing() {
  const maxRevenue = Math.max(...revenueData.map(d => d.value));

  return (
    <div className="space-y-8 pb-12">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Financial Pulse</h1>
        <p className="text-zinc-500 text-lg">Revenue is up 12% this week.</p>
      </header>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Revenue Chart - Large 2x1 Card */}
        <motion.div variants={item} className="md:col-span-2 bento-card flex flex-col justify-between min-h-[300px] relative overflow-hidden">
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-zinc-500 font-medium text-sm uppercase tracking-wide">Total Revenue</p>
              <h2 className="text-5xl font-semibold mt-1 tracking-tight">$30,600.50</h2>
            </div>
            <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              +12.4%
            </div>
          </div>

          {/* Simple SVG Chart Implementation */}
          <div className="absolute bottom-0 left-0 right-0 h-48 flex items-end justify-between px-8 pb-8 gap-4">
             {revenueData.map((d, i) => (
               <div key={d.day} className="flex flex-col items-center gap-2 flex-1 group">
                  <div className="relative w-full flex items-end h-32">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.value / maxRevenue) * 100}%` }}
                      transition={{ duration: 1, delay: i * 0.1, ease: "backOut" }}
                      className="w-full bg-zinc-100 rounded-t-xl group-hover:bg-[#0066cc] transition-colors relative"
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        ${d.value}
                      </div>
                    </motion.div>
                  </div>
                  <span className="text-xs text-zinc-400 font-medium">{d.day}</span>
               </div>
             ))}
          </div>
        </motion.div>

        {/* Actionable Stats Column */}
        <motion.div variants={item} className="space-y-6">
           <div className="bento-card bg-black text-white flex flex-col justify-between h-full min-h-[140px]">
              <div className="flex justify-between">
                <span className="text-zinc-400 text-sm font-medium">Overdue</span>
                <AlertPill count={2} />
              </div>
              <div>
                <p className="text-4xl font-semibold">$2,450</p>
                <p className="text-zinc-400 text-sm mt-1">Pending collection</p>
              </div>
           </div>

           <div className="bento-card flex flex-col justify-between h-full min-h-[140px]">
              <div className="flex justify-between">
                <span className="text-zinc-400 text-sm font-medium">Estimated</span>
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                   <ArrowUpRight className="w-4 h-4 text-zinc-500" />
                </div>
              </div>
              <div>
                <p className="text-4xl font-semibold">$14.2k</p>
                <p className="text-zinc-400 text-sm mt-1">WIP value to be billed</p>
              </div>
           </div>
        </motion.div>

        {/* Recent Invoices List */}
        <motion.div variants={item} className="md:col-span-3 bento-card">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-medium">Recent Invoices</h3>
             <button className="text-[#0066cc] text-sm font-medium hover:underline">View All</button>
           </div>
           
           <div className="space-y-2">
             {invoices.map((inv) => (
               <div key={inv.id} className="group flex items-center justify-between p-4 rounded-2xl hover:bg-zinc-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 
                      inv.status === 'Overdue' ? 'bg-rose-100 text-rose-600' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                       {inv.status === 'Paid' ? <CheckCircle2 className="w-6 h-6" /> : 
                        inv.status === 'Overdue' ? <Clock className="w-6 h-6" /> : <Receipt className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-semibold text-lg text-zinc-900">{inv.customer}</p>
                      <p className="text-sm text-zinc-500">{inv.id} • {inv.due}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-lg">${inv.amount.toLocaleString()}</p>
                    <StatusBadge status={inv.status} />
                  </div>
               </div>
             ))}
           </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function AlertPill({ count }: { count: number }) {
  return (
    <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
      {count} Action{count > 1 ? 's' : ''}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    Paid: 'text-emerald-600',
    Overdue: 'text-rose-600 font-bold',
    Sent: 'text-[#0066cc]',
    Draft: 'text-zinc-400',
  };
  return (
    <span className={`text-sm ${styles[status as keyof typeof styles]}`}>
      {status}
    </span>
  );
}
