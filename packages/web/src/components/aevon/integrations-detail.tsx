'use client'

import { useAutoplayInView } from '@/hooks/use-autoplay-in-view'
import { SectionHeading } from './section-heading'

function ToolIcon() {
  return (
    <div
      className="w-[40px] h-[40px] flex-shrink-0 rounded-sm flex items-center justify-center"
      style={{ background: 'rgba(248,250,252,0.12)' }}
      aria-hidden="true"
    >
      <div className="w-5 h-5 bg-[#F8FAFC] opacity-70 rounded-sm" />
    </div>
  )
}

type IntegrationCardProps = {
  tag: string
  title: string
  body: string
  tools: string[]
}

function IntegrationCard({ tag, title, body, tools }: IntegrationCardProps) {
  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-lg border"
      style={{
        borderColor: 'rgba(248,250,252,0.1)',
        background: 'rgba(248,250,252,0.03)',
      }}
    >
      <span className="text-[#94A3B8] text-[14px]">{tag}</span>
      <h3 className="text-[#F8FAFC] text-[20px] font-bold">{title}</h3>
      <p className="text-[#F8FAFC] text-[15px] leading-relaxed">{body}</p>
      <div className="flex items-center gap-3 pt-2">
        {tools.map((tool) => (
          <ToolIcon key={tool} />
        ))}
      </div>
    </div>
  )
}

const WORKFLOW_VIDEO_SRC =
  'https://framerusercontent.com/assets/6t9uviXadjnehCjXRel3A9vxMPk.mp4'
const WORKFLOW_VIDEO_POSTER =
  'https://framerusercontent.com/images/5HrepugeUFXW0y2jGKCp3Z8h4Y.jpg'

export function IntegrationsDetail() {
  const videoRef = useAutoplayInView<HTMLVideoElement>(0.2)

  return (
    <section
      className="bg-[#000000] py-[80px] lg:py-[180px]"
      aria-label="Integration categories"
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-[50px]">
        <SectionHeading
          eyebrow="Where it runs"
          title="Three surfaces. Same engine."
          description="Whether you paste an address in the browser, ask Claude Code, or pipe a folder of .sol files through your CI — same orchestrator, same grade, same overrides."
        />

        <div className="flex flex-col lg:flex-row gap-[30px]">
          <div className="flex flex-col gap-[30px] flex-1">
            <IntegrationCard
              tag="Web"
              title="Scanner"
              body="Paste Solidity source, EVM bytecode, or a deployed address. Live pipeline progress strip, color-coded grade panel, per-step event log. The route you're one click away from."
              tools={['Next.js', 'Server Action', 'Tailwind v4']}
            />
            <IntegrationCard
              tag="Terminal"
              title="CLI"
              body="Script the pipeline. trustlayer analyze prints a formatted report or raw JSON for jq. Gate PRs on minimum grade in three lines of YAML."
              tools={['tsx', 'JSON', 'GitHub Actions']}
            />
          </div>

          <div className="lg:w-[555px] flex-shrink-0">
            <div
              className="flex flex-col rounded-lg overflow-hidden border h-full min-h-[400px]"
              style={{
                borderColor: 'rgba(248,250,252,0.1)',
                background: 'rgba(248,250,252,0.03)',
              }}
            >
              <div className="flex flex-col gap-4 p-5">
                <span className="text-[#94A3B8] text-[14px]">
                  Editor
                </span>
                <h3 className="text-[#F8FAFC] text-[20px] font-bold">
                  MCP server
                </h3>
                <p className="text-[#F8FAFC] text-[15px] leading-relaxed">
                  Seven tools over stdio. Ask Claude Code, Cursor, Windsurf, Continue, or Zed: "is agent 0x… safe?" and get the A+ → F grade back in the same conversation. No copy-paste to a browser.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <ToolIcon />
                  <ToolIcon />
                  <ToolIcon />
                </div>
              </div>
              <div className="flex-1 min-h-[250px] overflow-hidden relative">
                <video
                  ref={videoRef}
                  src={WORKFLOW_VIDEO_SRC}
                  poster={WORKFLOW_VIDEO_POSTER}
                  muted
                  loop
                  playsInline
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: 'scale(1.15)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
