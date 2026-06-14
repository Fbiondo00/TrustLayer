import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Reveal, SectionHeading } from "@/components/sections/Reveal";
import { InputForm } from "@/components/scanner/InputForm";

export default function ScannerPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="relative isolate min-h-screen">
        <div className="aurora-hero pointer-events-none absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <SectionHeading
            eyebrow="Scanner"
            title={
              <>
                Scan an agent.
                <br />
                <span className="text-gradient">Get a trust grade in seconds.</span>
              </>
            }
            description={
              <>
                Paste Solidity source, bytecode, or a deployed address. TrustLayer runs the
                8-step mechanical pipeline end-to-end and prints a reproducible grade.
              </>
            }
          />

          <Reveal className="mt-12">
            <InputForm />
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}
