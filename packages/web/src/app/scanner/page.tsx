import { Navigation } from "@/components/aevon/navigation";
import { Footer } from "@/components/aevon/footer";
import { InputForm } from "@/components/scanner/InputForm";

export default function ScannerPage() {
  return (
    <>
      <Navigation />
      <main id="main" className="relative isolate min-h-screen bg-[#000000]">
        <div className="aurora-hero pointer-events-none absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-5 md:px-[50px] py-24 lg:py-32">
          <div className="flex flex-col gap-4 mb-12">
            <span
              className="inline-flex items-center self-start text-[#F8FAFC] text-[14px] px-5 py-2.5 rounded-full"
              style={{ background: "rgba(248,250,252,0.1)" }}
            >
              Scanner
            </span>
            <h1 className="text-[#F8FAFC] text-[28px] md:text-[40px] lg:text-[56px] font-bold leading-[1.1] text-balance">
              Scan a contract.
              <br />
              <span className="text-gradient">Get a trust grade in seconds.</span>
            </h1>
            <p className="text-[#F8FAFC] text-base lg:text-[17px] leading-relaxed max-w-2xl">
              Paste Solidity source, bytecode, or a deployed address. TrustLayer
              runs the mechanical pipeline end-to-end and prints a reproducible
              grade.
            </p>
          </div>

          <InputForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
