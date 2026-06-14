import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";
import { LogoCloud } from "@/components/sections/LogoCloud";
import { Problem } from "@/components/sections/Problem";
import { Pipeline } from "@/components/sections/Pipeline";
import { Score } from "@/components/sections/Score";
import { Demo } from "@/components/sections/Demo";
import { Developers } from "@/components/sections/Developers";
import { CTA } from "@/components/sections/CTA";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main" className="flex flex-col">
        <Hero />
        <LogoCloud />
        <Problem />
        <Pipeline />
        <Score />
        <Demo />
        <Developers />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
