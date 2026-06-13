"use client";

import { motion, type Variants } from "framer-motion";
import { type ReactNode } from "react";

const variants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <Reveal>
      <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
        <div
          className={`mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-brand ${
            align === "center" ? "mx-auto" : ""
          }`}
        >
          <span className="h-1 w-1 rounded-full bg-brand" />
          {eyebrow}
        </div>
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-4 text-pretty text-base leading-relaxed text-fg-muted sm:text-lg">
            {description}
          </p>
        ) : null}
      </div>
    </Reveal>
  );
}
