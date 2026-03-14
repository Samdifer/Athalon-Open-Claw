import { Link } from "react-router-dom";
import { Wrench, Shield, Calendar, Users, ArrowRight, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const features = [
  {
    icon: Wrench,
    title: "Work Order Management",
    description:
      "Track and manage maintenance work orders from open to close. Full squawk history, task card assignments, and RTS sign-off in one place.",
  },
  {
    icon: Shield,
    title: "Fleet & Compliance",
    description:
      "Monitor airworthiness directives and fleet-wide compliance status. Stay ahead of AD deadlines with automated tracking and alerts.",
  },
  {
    icon: Calendar,
    title: "Scheduling & Planning",
    description:
      "Optimize hangar capacity and technician assignments. Constraint-based scheduling keeps your shop running at peak efficiency.",
  },
  {
    icon: Users,
    title: "Customer Portal",
    description:
      "Give aircraft owners real-time visibility into maintenance progress. Approval workflows and status updates without the phone tag.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <header className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm select-none">
                A
              </span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Athelon
            </span>
          </Link>

          {/* Nav actions */}
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sign-in">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/sign-up">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-6">
            <Plane className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium tracking-wide uppercase">
              FAA Part 145 Maintenance Management
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-tight mb-6">
            Aircraft Maintenance,
            <br />
            Modernized.
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Athelon is the MRO platform built for FAA Part 145 repair stations.
            Work orders, fleet compliance, scheduling, and customer communication
            — unified in one system.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/sign-up">
                Get Started
                <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/sign-in">Sign In</Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="bg-muted/40 border-y border-border/60 py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                Everything your repair station needs
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Purpose-built for the operational realities of certified
                maintenance facilities — not adapted from generic project
                management software.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="gap-4">
                  <CardHeader>
                    <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center mb-1">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Waitlist */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Join the Waitlist
            </h2>
            <p className="text-muted-foreground mb-10">
              We are onboarding repair stations in phases. Reserve your spot and
              we will reach out when your region opens up.
            </p>

            {/* Waitlist form will be integrated here */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                placeholder="your@repairstation.com"
                disabled
                className="flex-1 h-10"
              />
              <Button disabled className="sm:w-auto w-full h-10 px-6">
                Reserve Spot
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Waitlist form coming soon. No spam — one email when you are up.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs select-none">
                A
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">Athelon</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Athelon. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
