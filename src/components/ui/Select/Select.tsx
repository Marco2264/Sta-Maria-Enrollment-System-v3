import React from "react";
import { ChevronDown, Check } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import { createPortal } from "react-dom";
import { cn } from "../utils";

interface SelectContextType {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
  placeholder?: string;
}

const SelectContext = React.createContext<SelectContextType>({
  open: false,
  setOpen: () => { /* empty */ },
  triggerRef: { current: null } as React.MutableRefObject<HTMLButtonElement | null>,
  contentRef: { current: null } as React.MutableRefObject<HTMLDivElement | null>
});

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({ children, value, defaultValue, onValueChange }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const controlledValue = value !== undefined ? value : internalValue;

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const isOutsideContent = contentRef.current && !contentRef.current.contains(target);
      
      if (isOutsideContainer && isOutsideContent) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, setOpen]);

  const handleChange = (newValue: string) => {
    if (value === undefined) setInternalValue(newValue);
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value: controlledValue, onValueChange: handleChange, open, setOpen, triggerRef, contentRef }}>
      <div ref={containerRef} data-slot="select" className="relative inline-block w-full">
        {children}
      </div>
    </SelectContext.Provider>);
};

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "default";
  asChild?: boolean;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, size = "default", children, asChild = false, ...props }, ref) => {
    const { open, setOpen, triggerRef } = React.useContext(SelectContext);
    const Comp = asChild ? Slot : "button";
    
    const combinedRef = React.useMemo(() => {
      return (node: HTMLButtonElement) => {
        triggerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      };
    }, [ref, triggerRef]);

    return (
      <Comp
        ref={combinedRef}
        type="button"
        data-slot="select-trigger"
        data-size={size}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          size === "default" ? "h-8" : "h-7 rounded-md",
          className
        )}
        {...props}>
        
        {children}
        <ChevronDown className="pointer-events-none size-4 text-muted-foreground" />
      </Comp>);
  }
);
SelectTrigger.displayName = "SelectTrigger";

interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

const SelectValue: React.FC<SelectValueProps> = ({ placeholder, children }) => {
  const { value } = React.useContext(SelectContext);
  return (
    <span data-slot="select-value" data-placeholder={!value || undefined} className={cn(!value && "text-muted-foreground")}>
      {children ? children : (value || placeholder)}
    </span>);

};

type SelectContentProps = React.HTMLAttributes<HTMLDivElement>

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open, triggerRef, contentRef } = React.useContext(SelectContext);
    const [coords, setCoords] = React.useState<{ top: number; left: number; width: number } | null>(null);

    React.useLayoutEffect(() => {
      const updatePosition = () => {
        if (open && triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          setCoords({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
          });
        }
      };

      updatePosition();

      if (open) {
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
          window.removeEventListener('scroll', updatePosition, true);
          window.removeEventListener('resize', updatePosition);
        };
      }
    }, [open, triggerRef]);

    const combinedRef = React.useMemo(() => {
      return (node: HTMLDivElement) => {
        contentRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      };
    }, [ref, contentRef]);

    if (!open || !coords) return null;

    return createPortal(
      <div
        ref={combinedRef}
        data-slot="select-content"
        style={{
          position: "absolute",
          top: `${coords.top + 4}px`,
          left: `${coords.left}px`,
          minWidth: `${coords.width}px`
        }}
        className={cn(
          "z-[102] overflow-hidden rounded-lg bg-background border border-border text-popover-foreground shadow-md animate-in fade-in zoom-in-95 duration-100",
          className
        )}
        {...props}>
        {children}
      </div>,
      document.body
    );
  }
);
SelectContent.displayName = "SelectContent";

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value: itemValue, ...props }, ref) => {
    const { value, onValueChange } = React.useContext(SelectContext);
    const isSelected = value === itemValue;

    return (
      <div
        ref={ref}
        data-slot="select-item"
        role="option"
        aria-selected={isSelected}
        onClick={() => onValueChange?.(itemValue)}
        className={cn(
          "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground",
          className
        )}
        {...props}>
        
        <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
          {isSelected && <Check className="size-4" />}
        </span>
        <span>{children}</span>
      </div>);

  }
);
SelectItem.displayName = "SelectItem";

type SelectGroupProps = React.HTMLAttributes<HTMLDivElement>

const SelectGroup = React.forwardRef<HTMLDivElement, SelectGroupProps>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="select-group" className={cn("p-1", className)} {...props} />

);
SelectGroup.displayName = "SelectGroup";

type SelectLabelProps = React.HTMLAttributes<HTMLDivElement>

const SelectLabel = React.forwardRef<HTMLDivElement, SelectLabelProps>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="select-label" className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)} {...props} />

);
SelectLabel.displayName = "SelectLabel";

type SelectSeparatorProps = React.HTMLAttributes<HTMLDivElement>

const SelectSeparator = React.forwardRef<HTMLDivElement, SelectSeparatorProps>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="select-separator" className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />

);
SelectSeparator.displayName = "SelectSeparator";

export { Select, SelectTrigger, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator, SelectValue };