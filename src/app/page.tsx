import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";
import { LogoCloud } from "@/components/sections/LogoCloud";
import { Problem } from "@/components/sections/Problem";
import { Pipeline } from "@/components/sections/Pipeline";
import { Score } from "@/components/sections/Score";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex flex-col">
        <Hero />
        <LogoCloud />
        <Problem />
        <Pipeline />
        <Score />
      </main>
    </>
  );
}
