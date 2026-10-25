"use client";

import React, { useRef, useEffect } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split string into array of characters padded to length
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const focusInput = (index: number) => {
    const clampedIndex = Math.max(0, Math.min(length - 1, index));
    inputRefs.current[clampedIndex]?.focus();
    inputRefs.current[clampedIndex]?.select();
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9a-zA-Z]/g, "");
    if (!rawVal) {
      // Empty / deleted
      const newDigits = [...digits];
      newDigits[index] = "";
      const newValue = newDigits.join("").trim();
      onChange(newValue);
      return;
    }

    if (rawVal.length > 1) {
      // Multi-character input (e.g. mobile autofill)
      handlePastedContent(rawVal, index);
      return;
    }

    // Single character input
    const char = rawVal[rawVal.length - 1].toUpperCase();
    const newDigits = [...digits];
    newDigits[index] = char;
    const nextValue = newDigits.join("");
    onChange(nextValue);

    if (index < length - 1) {
      focusInput(index + 1);
    }

    if (nextValue.length === length && onComplete) {
      onComplete(nextValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
        focusInput(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePastedContent = (pastedText: string, startIndex = 0) => {
    const clean = pastedText.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
    if (!clean) return;

    const newDigits = [...digits];
    let writeIdx = startIndex;
    for (let i = 0; i < clean.length && writeIdx < length; i++) {
      newDigits[writeIdx] = clean[i];
      writeIdx++;
    }

    const nextValue = newDigits.join("");
    onChange(nextValue);

    // Focus either the next empty slot or the last slot
    const nextSlot = Math.min(writeIdx, length - 1);
    focusInput(nextSlot);

    if (nextValue.length === length && onComplete) {
      onComplete(nextValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    handlePastedContent(pasted, 0);
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
      {Array.from({ length }).map((_, index) => {
        const isFilled = Boolean(digits[index]);
        return (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9a-zA-Z]*"
            maxLength={1}
            value={digits[index]}
            disabled={disabled}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            aria-label={`Digit ${index + 1} of verification code`}
            className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl transition-all outline-none select-none ${
              isFilled
                ? "bg-zinc-900 border-2 border-emerald-500/70 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                : "bg-zinc-950/80 border border-zinc-800 text-zinc-100 hover:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          />
        );
      })}
    </div>
  );
}
