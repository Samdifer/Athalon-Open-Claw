import { useMemo } from "react";
import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip 
} from "recharts";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const revenueData = [
  { name: "Jan", value: 42000 },
  { name: "Feb", value: 38000 },
  { name: "Mar", value: 55000 },
  { name: "Apr", value: 48000 },
  { name: "May", value: 62000 },
  { name: "Jun", value: 75000 },
];

const turnaroundData = [
  { name: "Insp.", value: 4.2 },
  { name: "Engine", value: 12.5 },
  { name: "Avionics", value: 8.1 },
  { name: "Interior", value: 15.0 },
  { name: "Paint", value: 21.3 },
];

const fleetHealthData = [
  { name: "Airworthy", value: 18, color: "var(--color-ios-green)" },
  { name: "In Maint.", value: 4, color: "var(--color-ios-blue)" },
  { name: "AOG", value: 2, color: "var(--color-ios-red)" },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

interface BentoCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

function BentoCard({ title, subtitle, children, className = "", icon }: BentoCardProps) {
  return (
    <div className={`ios-card flex flex-col h-full ${className}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-[13px] font-semibold text-ios-label-secondary uppercase tracking-wider uppercase tracking-wider">{title}</h3>
          {subtitle && <p className="text-[11px] text-ios-label-tertiary">{subtitle}</p>}
        </div>
        {icon && <div className="text-ios-label-tertiary">{icon}</div>}
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}

export default function Analytics() {
  return (
    <div className="bg-ios-bg min-h-screen">
      <IOSNavBar 
        title="Analytics" 
        backHref="/more" 
        backLabel="More" 
        largeTitle 
      />

      <div className="px-4 py-4 space-y-4 pb-20">
        {/* Top Row: Revenue Trend (Full Width or 2/3) */}
        <BentoCard 
          title="Revenue Growth" 
          subtitle="Last 6 months (USD)"
          icon={<DollarSign className="w-4 h-4" />}
          className="h-[240px]"
        >
          <div className="flex items-end gap-2 mb-4">
            <span className="text-[32px] font-bold tracking-tight">$328.5k</span>
            <span className="text-ios-green text-[14px] font-medium flex items-center mb-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              12.4%
            </span>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-ios-separator)" />
                <XAxis 
                  dataKey="name" 
                  hide={false} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fill: "var(--color-ios-label-tertiary)"}}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--color-ios-blue)" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "var(--color-ios-blue)", strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        {/* Second Row: 1x1 Grid */}
        <div className="grid grid-cols-2 gap-4 h-[180px]">
          <BentoCard 
            title="Avg. TAT" 
            subtitle="Turnaround Time (Days)"
            icon={<Clock className="w-4 h-4" />}
          >
            <div className="flex flex-col justify-center h-full">
              <div className="text-[28px] font-bold text-ios-orange">8.4</div>
              <div className="h-16 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={turnaroundData}>
                    <Bar dataKey="value" fill="var(--color-ios-orange)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </BentoCard>

          <BentoCard 
            title="Fleet Health" 
            subtitle="Current status distribution"
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            <div className="flex items-center justify-between h-full">
              <div className="h-24 w-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fleetHealthData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={40}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {fleetHealthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-1 pr-2">
                {fleetHealthData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-medium text-ios-label-secondary">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </BentoCard>
        </div>

        {/* Third Row: 3 small cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="ios-card p-3 flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-ios-red/10 flex items-center justify-center mb-1">
              <AlertTriangle className="w-4 h-4 text-ios-red" />
            </div>
            <div className="text-[18px] font-bold text-ios-red">2</div>
            <div className="text-[10px] text-ios-label-secondary">AOG Risks</div>
          </div>

          <div className="ios-card p-3 flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-ios-blue/10 flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-ios-blue" />
            </div>
            <div className="text-[18px] font-bold text-ios-blue">94%</div>
            <div className="text-[10px] text-ios-label-secondary">Utilization</div>
          </div>

          <div className="ios-card p-3 flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-ios-green/10 flex items-center justify-center mb-1">
              <CheckCircle2 className="w-4 h-4 text-ios-green" />
            </div>
            <div className="text-[18px] font-bold text-ios-green">100%</div>
            <div className="text-[10px] text-ios-label-secondary">SLA Comp.</div>
          </div>
        </div>

        {/* Bottom Card: Tech Productivity */}
        <BentoCard 
          title="Labor Efficiency" 
          subtitle="Billed vs. Available Hours"
          icon={<TrendingUp className="w-4 h-4" />}
          className="h-[140px]"
        >
          <div className="flex items-center justify-between mt-2">
            <div className="space-y-1">
              <div className="text-[24px] font-bold tracking-tight">1,240 hrs</div>
              <p className="text-[12px] text-ios-label-secondary">Total Billed this Month</p>
            </div>
            <div className="flex items-center gap-1 text-ios-red font-medium">
              <ArrowDownRight className="w-4 h-4" />
              <span>3.2%</span>
            </div>
          </div>
          <div className="w-full bg-ios-bg-tertiary h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-ios-blue h-full w-[82%]" />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-ios-label-tertiary">Target: 1,500 hrs</span>
            <span className="text-[10px] text-ios-label-tertiary">82% of goal</span>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
