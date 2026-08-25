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
  registerItem?: (value: string, label: React.ReactNode) => void;
  itemLabels?: Record<string, React.ReactNode>;
}

const SelectContext = React.createContext<SelectContextType>({
  open: false,
  setOpen: () => { /* empty */ },
  triggerRef: { current: null } as React.MutableRefObject<HTMLButtonElement | null>,
  contentRef: { current: null } as React.MutableRefObject<HTMLDivElement | null>,
  registerItem: () => {},
  itemLabels: {}
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
  const [itemLabels, setItemLabels] = React.useState<Record<string, React.ReactNode>>({});
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const controlledValue = value !== undefined ? value : internalValue;

  const registerItem = React.useCallback((val: string, label: React.ReactNode) => {
    setItemLabels((prev) => {
      if (prev[val] === label) return prev;
      return { ...prev, [val]: label };
    });
  }, []);

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
    <SelectContext.Provider value={{ value: controlledValue, onValueChange: handleChange, open, setOpen, triggerRef, contentRef, registerItem, itemLabels }}>
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
  const { value, itemLabels } = React.useContext(SelectContext);
  const displayContent = children ?? (value ? (itemLabels?.[value] ?? value) : placeholder);
  return (
    <span data-slot="select-value" data-placeholder={!value || undefined} className={cn(!value && "text-muted-foreground")}>
      {displayContent}
    </span>);
};

type SelectContentProps = React.HTMLAttributes<HTMLDivElement>

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open, triggerRef, contentRef } = React.useContext(SelectContext);
    const [coords, setCoords] = React.useState<{ top: number; left: number; width: number; openUpwards: boolean; maxHeight: number } | null>(null);

    React.useLayoutEffect(() => {
      const updatePosition = () => {
        if (open && triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - rect.bottom;
          const spaceAbove = rect.top;
          
          // If less than 260px space below, and more space above, open upwards
          const openUpwards = spaceBelow < 260 && spaceAbove > spaceBelow;
          const maxHeight = Math.max(160, Math.min(280, (openUpwards ? spaceAbove : spaceBelow) - 16));

          setCoords({
            top: openUpwards ? (rect.top + window.scrollY - 4) : (rect.bottom + window.scrollY + 4),
            left: rect.left + window.scrollX,
            width: rect.width,
            openUpwards,
            maxHeight,
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
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          minWidth: `${coords.width}px`,
          maxHeight: `${coords.maxHeight}px`,
          transform: coords.openUpwards ? 'translateY(-100%)' : 'none',
        }}
        className={cn(
          "z-[102] overflow-y-auto custom-scrollbar rounded-xl bg-white border border-slate-200 text-slate-800 shadow-xl animate-in fade-in zoom-in-95 duration-100",
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
  disabled?: boolean;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value: itemValue, disabled, ...props }, ref) => {
    const { value, onValueChange, registerItem } = React.useContext(SelectContext);
    const isSelected = value === itemValue;

    React.useEffect(() => {
      if (itemValue && children && registerItem) {
        registerItem(itemValue, children);
      }
    }, [itemValue, children, registerItem]);

    return (
      <div
        ref={ref}
        data-slot="select-item"
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabled}
        onClick={() => !disabled && onValueChange?.(itemValue)}
        className={cn(
          "relative flex w-full items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none select-none",
          disabled ? "opacity-50 pointer-events-none cursor-not-allowed bg-slate-50 text-slate-400 font-medium" : "hover:bg-accent hover:text-accent-foreground cursor-pointer",
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