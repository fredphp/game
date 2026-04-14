'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/stores/game-store'
import { ChevronRight, SkipForward, Gift } from 'lucide-react'

export default function TutorialOverlay() {
  const {
    tutorialActive, tutorialSteps, tutorialStepIndex,
    nextTutorialStep, skipTutorial, tutorialCompleted
  } = useGameStore()

  const [visible, setVisible] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [triggerRender, setTriggerRender] = useState(0)

  const currentStep = tutorialSteps[tutorialStepIndex]

  // Compute highlight/position from DOM on demand
  const { highlightRect, arrowPos, dialogPos } = useMemo(() => {
    // triggerRender used to force recalc on step change
    void triggerRender
    if (!tutorialActive || !currentStep?.targetId) {
      return { highlightRect: null, arrowPos: { x: 0, y: 0 }, dialogPos: 'bottom' as const }
    }
    const target = document.getElementById(currentStep.targetId)
    if (!target) {
      return { highlightRect: null, arrowPos: { x: 0, y: 0 }, dialogPos: 'bottom' as const }
    }
    const rect = target.getBoundingClientRect()
    const pos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    let dPos: 'bottom' | 'top' | 'left' | 'right' = 'bottom'
    if (rect.top < 200) dPos = 'bottom'
    else if (rect.bottom > (typeof window !== 'undefined' ? window.innerHeight : 900) - 250) dPos = 'top'
    else if (rect.left < 150) dPos = 'right'
    else if (rect.right > (typeof window !== 'undefined' ? window.innerWidth : 1200) - 150) dPos = 'left'
    return { highlightRect: rect, arrowPos: pos, dialogPos: dPos }
  })

  // Trigger recalculation and show animation when step changes
  useEffect(() => {
    if (!tutorialActive || !currentStep) return
    // Show after a brief delay for natural feel
    const showTimer = setTimeout(() => {
 setTriggerRender(c => c + 1)
      setVisible(true)
    }, 100)
    return () => clearTimeout(showTimer)
  }, [tutorialActive, tutorialStepIndex, currentStep])

  const handleNext = useCallback(() => {
    setVisible(false)
    setTimeout(() => nextTutorialStep(), 300)
  }, [nextTutorialStep])

  const handleSkip = useCallback(() => {
    setVisible(false)
    setTimeout(() => skipTutorial(), 300)
  }, [skipTutorial])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    // Only proceed if clicking on the overlay (not on dialog or highlighted area)
    if (e.target === overlayRef.current) {
      handleNext()
    }
  }, [handleNext])

  if (!tutorialActive || !currentStep || tutorialCompleted) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-[100]"
        >
          {/* Dark overlay with highlight cutout */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <mask id="tutorial-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {highlightRect && (
                  <rect
                    x={highlightRect.x - 4}
                    y={highlightRect.y - 4}
                    width={highlightRect.width + 8}
                    height={highlightRect.height + 8}
                    rx="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0" y="0" width="100%" height="100%"
              fill="rgba(0,0,0,0.75)"
              mask="url(#tutorial-mask)"
            />
          </svg>

          {/* Highlight border animation */}
          {highlightRect && (
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(251,191,36,0.5)',
                  '0 0 0 8px rgba(251,191,36,0.2)',
                  '0 0 0 12px rgba(251,191,36,0)',
                ],
              }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute rounded-xl border-2 border-amber-400 pointer-events-none"
              style={{
                left: highlightRect.x - 4,
                top: highlightRect.y - 4,
                width: highlightRect.width + 8,
                height: highlightRect.height + 8,
              }}
            />
          )}

          {/* Tutorial Dialog */}
          <TutorialDialog
            step={currentStep}
            stepIndex={tutorialStepIndex}
            totalSteps={tutorialSteps.length}
            position={dialogPos}
            arrowPos={highlightRect ? arrowPos : null}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function TutorialDialog({
  step,
  stepIndex,
  totalSteps,
  position,
  arrowPos,
  onNext,
  onSkip,
}: {
  step: ReturnType<typeof useGameStore.getState>['tutorialSteps'][0]
  stepIndex: number
  totalSteps: number
  position: 'bottom' | 'top' | 'left' | 'right'
  arrowPos: { x: number; y: number } | null
  onNext: () => void
  onSkip: () => void
}) {
  const positionClasses = {
    bottom: 'bottom-24 left-4 right-4',
    top: 'top-6 left-4 right-4',
    left: 'left-4 top-1/2 -translate-y-1/2 max-w-[280px]',
    right: 'right-4 top-1/2 -translate-y-1/2 max-w-[280px]',
  }

  const progress = ((stepIndex + 1) / totalSteps) * 100

  return (
    <motion.div
      initial={{ y: position === 'bottom' ? 30 : position === 'top' ? -30 : 0, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: position === 'bottom' ? 30 : position === 'top' ? -30 : 0, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className={`absolute ${positionClasses[position]}`}
    >
      <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-amber-500/40 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-700">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600"
          />
        </div>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            {/* NPC Avatar */}
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500/20 to-amber-700/20 rounded-xl border border-amber-500/30 flex items-center justify-center text-2xl">
              {step.npcAvatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-amber-300">{step.npcName}</span>
                {step.isRequired && (
                  <span className="px-1.5 py-0.5 bg-red-500/20 rounded text-[9px] text-red-400 font-bold">
                    必做
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {stepIndex + 1} / {totalSteps} · {step.title}
              </div>
            </div>
          </div>

          {/* Dialog text */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/80 rounded-xl p-3 mb-3 border border-slate-700/50"
          >
            <p className="text-sm text-slate-200 leading-relaxed">{step.dialogText}</p>
          </motion.div>

          {/* Reward */}
          {step.reward && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-1.5 mb-3 px-2 py-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20"
            >
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-amber-300">奖励: {step.reward}</span>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            {!step.isRequired && (
              <button
                onClick={(e) => { e.stopPropagation(); onSkip() }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors"
              >
                <SkipForward className="w-3 h-3" />
                跳过引导
              </button>
            )}
            {step.isRequired && <div />}

            <button
              onClick={(e) => { e.stopPropagation(); onNext() }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg text-sm font-medium text-white hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20"
            >
              <span>{stepIndex < totalSteps - 1 ? '下一步' : '完成'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
