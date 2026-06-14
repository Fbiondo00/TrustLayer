import { CursorFollower } from "@/components/aevon/cursor-follower";
import { Navigation } from "@/components/aevon/navigation";
import { Hero } from "@/components/aevon/hero";
import { IntegrationsMarquee } from "@/components/aevon/integrations-marquee";
import { Services } from "@/components/aevon/services";
import { Process } from "@/components/aevon/process";
import { IntegrationsDetail } from "@/components/aevon/integrations-detail";
import { Stats } from "@/components/aevon/stats";
import { CaseStudies } from "@/components/aevon/case-studies";
import { Team } from "@/components/aevon/team";
import { Testimonials } from "@/components/aevon/testimonials";
import { Packages } from "@/components/aevon/packages";
import { FAQ } from "@/components/aevon/faq";
import { Contact } from "@/components/aevon/contact";
import { Footer } from "@/components/aevon/footer";

export default function Home() {
  return (
    <>
      <CursorFollower />
      <Navigation />
      <main id="main" className="bg-[#000000]">
        <Hero />
        <IntegrationsMarquee />
        <Services />
        <Process />
        <IntegrationsDetail />
        <Stats />
        <CaseStudies />
        <Team />
        <Testimonials />
        <Packages />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
