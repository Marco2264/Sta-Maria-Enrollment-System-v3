import React from "react";
import { Check } from "lucide-react";
import { cn } from "../utils";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, defaultChecked, onCheckedChange, onChange, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(defaultChecked ?? false);
    const controlledChecked = checked !== undefined ? checked : isChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = e.target.checked;
      if (checked === undefined) setIsChecked(newChecked);
      onChange?.(e);
      onCheckedChange?.(newChecked);
    };

    return (
      <label
        data-slot="checkbox"
        data-checked={controlledChecked || undefined}
        className={cn(
          "peer relative inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-input transition-colors outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground dark:bg-input/30 dark:data-[checked]:bg-primary",
          className
        )}>
        
        <input
          ref={ref}
          type="checkbox"
          checked={controlledChecked}
          onChange={handleChange}
          className="sr-only"
          {...props} />
        
        {controlledChecked && <Check className="size-3.5" />}
      </label>);

  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };