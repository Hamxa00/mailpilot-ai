import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, CirclePlay } from "lucide-react";
import { Typography } from "@/components/ui/typography";

export default function Home() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-24 bg-background overflow-hidden">
      {/* Blurred radial background effect */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-radial from-primary/10 via-transparent to-transparent blur-3xl"
      />

      {/* Decorative top-right glowing shape */}
      <div
        aria-hidden
        className="absolute right-[-100px] top-[-100px] h-[300px] w-[300px] rounded-full bg-primary/20 blur-3xl -z-10"
      />

      {/* Hero Content */}
      <div className="relative z-10 text-center max-w-3xl space-y-6">
        {/* Launch Badge */}
        <Badge className="bg-gradient-to-r from-primary to-muted/30 text-white rounded-full px-4 py-1 text-sm border-none shadow-md">
          🚀 Just launched — MailPilot v1.0.0
        </Badge>

        {/* Heading */}
        <Typography
          variant="h1"
          className="text-balance text-5xl md:text-6xl font-extrabold tracking-tight text-foreground"
        >
          Simplify Your Inbox with AI
        </Typography>

        {/* Description */}
        <Typography variant="lead" className="max-w-xl mx-auto">
          Experience a minimal, intelligent email client built for clarity and
          speed. Stay focused with zero clutter and smart automation that works
          for you.
        </Typography>

        {/* Call to Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="rounded-full px-6 text-base hover:scale-[1.02] transition-transform"
          >
            Get Started <ArrowUpRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-6 text-base shadow-none hover:scale-[1.02] transition-transform"
          >
            <CirclePlay className="mr-2 h-5 w-5" /> Watch Demo
          </Button>
        </div>

        {/* Optional Subtitle or Slogan */}
        <Typography variant="muted" className="mt-6 text-sm">
          Built for speed. Powered by intelligence. Loved by inbox minimalists.
        </Typography>
      </div>
    </div>
  );
}
