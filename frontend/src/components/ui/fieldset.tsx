"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// ============================================================================
// Fieldset — A semantic grouping for related form fields
// ============================================================================

interface FieldsetProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  /** Section label rendered as a <legend> */
  label?: string;
  /** Optional description below the legend */
  description?: string;
  children: React.ReactNode;
}

function Fieldset({
  label,
  description,
  className,
  children,
  ...props
}: FieldsetProps) {
  return (
    <fieldset
      className={cn("space-y-4 border-0 p-0 m-0", className)}
      {...props}
    >
      {label && (
        <legend className="flex flex-col gap-0.5 pb-2">
          <span className="text-sm font-semibold text-foreground tracking-tight">
            {label}
          </span>
          {description && (
            <span className="text-xs text-muted-foreground font-normal">
              {description}
            </span>
          )}
        </legend>
      )}
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

// ============================================================================
// FieldsetDivider — Visual break between fieldsets within the same form
// ============================================================================

function FieldsetDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn("border-t border-border", className)}
      role="separator"
    />
  );
}

// ============================================================================
// FormField — A single labeled form field with optional description
// ============================================================================

interface FormFieldProps {
  /** Field label text */
  label: string;
  /** HTML id linking label to input (for accessibility) */
  htmlFor?: string;
  /** Short helper text below the input */
  description?: React.ReactNode;
  /** Show a visual required indicator */
  required?: boolean;
  /** Error message (replaces description when present) */
  error?: string;
  /** Layout direction */
  horizontal?: boolean;
  children: React.ReactNode;
  className?: string;
}

function FormField({
  label,
  htmlFor,
  description,
  required,
  error,
  horizontal = false,
  children,
  className,
}: FormFieldProps) {
  if (horizontal) {
    return (
      <div className={cn("flex items-start gap-3", className)}>
        <div className="pt-0.5 shrink-0">{children}</div>
        <div className="space-y-0.5">
          <Label htmlFor={htmlFor} className="text-sm cursor-pointer">
            {label}
            {required && (
              <span className="text-destructive ml-0.5">*</span>
            )}
          </Label>
          {error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm">
        {label}
        {required && (
          <span className="text-destructive ml-0.5">*</span>
        )}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export { Fieldset, FieldsetDivider, FormField };
