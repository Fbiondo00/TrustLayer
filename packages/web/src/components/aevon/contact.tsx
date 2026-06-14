'use client'

import { useMemo, useState } from 'react'
import { useAutoplayInView } from '@/hooks/use-autoplay-in-view'
import { useScrollAnimation } from '@/hooks/use-scroll-animation'

const CONTACT_VIDEO_SRC =
  'https://framerusercontent.com/assets/aPKDa8W0Uub9uymOhukZHBltBm0.mp4'
const CONTACT_VIDEO_POSTER =
  'https://framerusercontent.com/images/KuT37i1XIEhMM0w48r2bV8Kkxuk.jpg'

type FieldName = 'name' | 'email' | 'phone' | 'message'

const FIELDS: { name: FieldName; label: string; type: string; placeholder: string; required: boolean; autoComplete: string; rows?: number }[] = [
  { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Full Name *', required: true, autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'Email *', required: true, autoComplete: 'email' },
  { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: 'Phone Number', required: false, autoComplete: 'tel' },
  { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Message *', required: true, autoComplete: 'off', rows: 4 },
]

type Errors = Partial<Record<FieldName, string>>

function validate(data: Record<string, string>): Errors {
  const errors: Errors = {}
  if (!data.name?.trim()) errors.name = 'Please enter your name.'
  if (!data.email?.trim()) {
    errors.email = 'Please enter your email.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please enter a valid email address.'
  }
  if (!data.message?.trim()) errors.message = 'Please enter a message.'
  return errors
}

function Field({
  config,
  error,
}: {
  config: (typeof FIELDS)[number]
  error?: string
}) {
  const errorId = `${config.name}-error`
  const baseClass =
    'w-full bg-transparent border text-[#F8FAFC] placeholder-[#94A3B8] rounded-md px-4 py-3 text-[15px] transition-colors duration-200 focus:outline-none'
  const style = {
    borderColor: error ? '#EF4444' : 'rgba(248,250,252,0.2)',
  }

  const describedBy = error ? errorId : undefined

  if (config.type === 'textarea') {
    return (
      <div>
        <label htmlFor={`contact-${config.name}`} className="sr-only">
          {config.label}
          {config.required && (
            <span aria-hidden="true"> *</span>
          )}
        </label>
        <textarea
          id={`contact-${config.name}`}
          name={config.name}
          placeholder={config.placeholder}
          required={config.required}
          rows={config.rows ?? 4}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`${baseClass} resize-none`}
          style={style}
        />
        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-red-400 text-[13px] mt-1"
          >
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <label htmlFor={`contact-${config.name}`} className="sr-only">
        {config.label}
        {config.required && (
          <span aria-hidden="true"> *</span>
        )}
      </label>
      <input
        id={`contact-${config.name}`}
        type={config.type}
        name={config.name}
        autoComplete={config.autoComplete}
        placeholder={config.placeholder}
        required={config.required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={baseClass}
        style={style}
      />
      {error && (
        <p id={errorId} role="alert" className="text-red-400 text-[13px] mt-1">
          {error}
        </p>
      )}
    </div>
  )
}

export function Contact() {
  const { ref: headingRef, isVisible: headingVisible } =
    useScrollAnimation<HTMLDivElement>()
  const videoRef = useAutoplayInView<HTMLVideoElement>(0.2)

  // Client-only stub: no server action. Form validates inline and flips a
  // success flag on submit. Real backend wiring is out of scope for this pass.
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)

  const errorCount = useMemo(() => Object.keys(errors).length, [errors])

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: Record<string, string> = {}
    for (const [k, v] of formData.entries()) data[k] = String(v)
    const next = validate(data)
    setErrors(next)
    if (Object.keys(next).length === 0) {
      setSubmitted(true)
    }
  }

  return (
    <section
      id="contact"
      className="bg-[#000000] pb-[80px] lg:pb-[120px]"
      aria-label="Contact"
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-[50px]">
        <div
          ref={headingRef}
          className="flex flex-col gap-4 anim-fade-up"
          style={headingVisible ? { opacity: 1, transform: 'translateY(0)' } : {}}
        >
          <span
            className="inline-flex items-center self-start text-[#F8FAFC] text-[14px] px-5 py-2.5 rounded-full"
            style={{ background: 'rgba(248,250,252,0.1)' }}
          >
            Get started
          </span>
          <h2
            className="text-[#F8FAFC] text-[28px] md:text-[40px] lg:text-[56px] font-bold text-balance"
            style={{ maxWidth: 900 }}
          >
            Ready to scan?
          </h2>
          <p className="text-[#F8FAFC] text-base lg:text-[17px] leading-relaxed">
            Paste a contract address, Solidity source, or bytecode. Get a
            reproducible trust grade in seconds — or drop us a line below.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-[30px] mt-[60px]">
          <div
            className="hidden lg:block lg:w-[533px] flex-shrink-0 rounded-lg overflow-hidden"
            style={{ minHeight: '450px' }}
          >
            <video
              ref={videoRef}
              src={CONTACT_VIDEO_SRC}
              poster={CONTACT_VIDEO_POSTER}
              muted
              loop
              playsInline
              aria-hidden="true"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1">
            <h3 className="text-[#F8FAFC] text-[20px] md:text-[24px] font-bold mb-8">
              Questions, integrations, or bounty pitches
            </h3>

            {submitted ? (
              <p
                className="text-[var(--color-aevon-accent)] text-[17px] py-4"
                role="status"
                aria-live="polite"
              >
                Message received. We will be in touch.
              </p>
            ) : (
              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                {FIELDS.map((config) => (
                  <Field
                    key={config.name}
                    config={config}
                    error={errors[config.name]}
                  />
                ))}

                {errorCount > 0 && (
                  <p className="text-red-400 text-[13px]" role="alert">
                    Please fix the highlighted fields.
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[var(--color-aevon-accent)] text-[#F8FAFC] text-[14px] font-medium hover:bg-[var(--color-aevon-accent-hover)] transition-colors duration-200 min-h-[44px]"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
