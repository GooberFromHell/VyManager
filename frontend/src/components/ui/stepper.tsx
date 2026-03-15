"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StepperStep {
  id: string;
  title: string;
  description?: string;
}

interface StepperContextValue {
  steps: StepperStep[];
  currentIndex: number;
  goTo: (index: number) => void;
}

const StepperContext = React.createContext<StepperContextValue | null>(null);

function useStepperContext() {
  const ctx = React.useContext(StepperContext);
  if (!ctx) throw new Error("useStepperContext must be used inside <Stepper>");
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

interface StepperProps {
  steps: StepperStep[];
  currentIndex: number;
  onGoTo?: (index: number) => void;
  children: React.ReactNode;
  className?: string;
}

export function Stepper({
  steps,
  currentIndex,
  onGoTo,
  children,
  className,
}: StepperProps) {
  const goTo = React.useCallback(
    (index: number) => {
      // Only allow going to already-completed steps
      if (onGoTo && index < currentIndex) {
        onGoTo(index);
      }
    },
    [onGoTo, currentIndex]
  );

  return (
    <StepperContext.Provider value={{ steps, currentIndex, goTo }}>
      <div className={cn("flex flex-col gap-6", className)}>
        <StepperHeader />
        {children}
      </div>
    </StepperContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header – horizontal step indicators
// ─────────────────────────────────────────────────────────────────────────────

function StepperHeader() {
  const { steps, currentIndex, goTo } = useStepperContext();

  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isClickable = isCompleted;

          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center",
                index < steps.length - 1 ? "flex-1" : ""
              )}
            >
              {/* Step circle + label */}
              <button
                type="button"
                onClick={() => isClickable && goTo(index)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center gap-1 group focus:outline-none",
                  isClickable ? "cursor-pointer" : "cursor-default"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {/* Circle */}
                <span
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold border-2 transition-all duration-200",
                    isCompleted &&
                      "bg-primary border-primary text-primary-foreground",
                    isCurrent &&
                      "bg-background border-primary text-primary ring-2 ring-primary/20",
                    !isCompleted &&
                      !isCurrent &&
                      "bg-background border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </span>

                {/* Title */}
                <span
                  className={cn(
                    "text-xs font-medium whitespace-nowrap transition-colors duration-200",
                    isCurrent && "text-foreground",
                    isCompleted && "text-muted-foreground",
                    !isCompleted && !isCurrent && "text-muted-foreground/50"
                  )}
                >
                  {step.title}
                </span>
              </button>

              {/* Connector line (not after the last step) */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 mb-5">
                  <div
                    className={cn(
                      "h-0.5 rounded-full transition-all duration-300",
                      isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Content panel
// ─────────────────────────────────────────────────────────────────────────────

interface StepperContentProps {
  stepIndex: number;
  children: React.ReactNode;
  className?: string;
}

export function StepperContent({
  stepIndex,
  children,
  className,
}: StepperContentProps) {
  const { currentIndex } = useStepperContext();
  if (currentIndex !== stepIndex) return null;
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation (Back / Next / Submit)
// ─────────────────────────────────────────────────────────────────────────────

interface StepperNavigationProps {
  onNext?: () => void;
  onBack?: () => void;
  onSubmit?: () => void;
  nextLabel?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
  extraStart?: React.ReactNode;
  extraEnd?: React.ReactNode;
}

export function StepperNavigation({
  onNext,
  onBack,
  onSubmit,
  nextLabel = "Next",
  submitLabel = "Submit",
  isSubmitting = false,
  extraStart,
  extraEnd,
}: StepperNavigationProps) {
  const { currentIndex, steps } = useStepperContext();
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  return (
    <div className="flex items-center justify-between pt-2">
      <div className="flex items-center gap-2">
        {extraStart}
        <button
          type="button"
          onClick={onBack}
          disabled={isFirst || isSubmitting}
          className={cn(
            "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            "h-9 px-4 py-2",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          Back
        </button>
      </div>

      <div className="flex items-center gap-2">
        {extraEnd}
        {isLast ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "h-9 px-4 py-2",
              "disabled:pointer-events-none disabled:opacity-50"
            )}
          >
            {isSubmitting && (
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {submitLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={isSubmitting}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "h-9 px-4 py-2",
              "disabled:pointer-events-none disabled:opacity-50"
            )}
          >
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
