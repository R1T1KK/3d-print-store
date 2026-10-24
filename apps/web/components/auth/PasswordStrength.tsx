import React from "react";
import { checkPasswordStrength } from "@/lib/auth-validators";

export { checkPasswordStrength };

interface PasswordStrengthProps {
  password: string;
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const { score, label, color } = checkPasswordStrength(password);

  return (
    <div className="space-y-1.5 mt-1.5 animate-in fade-in">
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-zinc-400">Password Strength:</span>
        <span
          className={
            score <= 1
              ? "text-rose-400"
              : score === 2
              ? "text-amber-400"
              : score === 3
              ? "text-cyan-400"
              : "text-emerald-400"
          }
        >
          {label}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 h-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-full rounded-full transition-all duration-300 ${
              score >= step ? color : "bg-zinc-800"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
