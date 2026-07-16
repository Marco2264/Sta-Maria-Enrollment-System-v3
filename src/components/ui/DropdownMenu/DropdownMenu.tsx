import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../utils";

interface DropdownMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType>({
  open: false,
  setOpen: () => { /* empty */ }
});

interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ children, open, defaultOpen = false, onOpenChange }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const controlledOpen = open !== undefined ? open : isOpen;

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (open === undefined) setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  }, [open, onOpenChange]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleOpenChange(false);
      }
    };
    if (controlledOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [controlledOpen, handleOpenChange]);

  return (
    <DropdownMenuContext.Provider value={{ open: controlledOpen, setOpen: handleOpenChange }}>
      <div ref={containerRef} className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>);
};

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ onClick, asChild = false, ...props }, ref) => {
    const { open, setOpen } = React.useContext(DropdownMenuContext);
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type="button"
        data-slot="dropdown-menu-trigger"
        aria-expanded={open}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          setOpen(!open);
          onClick?.(e);
        }}
        {...props} />);
  }
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

type DropdownMenuContentProps = React.HTMLAttributes<HTMLDivElement>

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, ...props }, ref) => {
    const { open } = React.useContext(DropdownMenuContext);
    if (!open) return null;

    return (
      <div
        ref={ref}
        data-slot="dropdown-menu-content"
        className={cn(
          "absolute top-full left-0 z-50 mt-1 min-w-32 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
          className
        )}
        {...props} />);


  }
);
DropdownMenuContent.displayName = "DropdownMenuContent";

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  variant?: "default" | "destructive";
}

const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, inset, variant = "default", ...props }, ref) => {
    const { setOpen } = React.useContext(DropdownMenuContext);
    return (
      <div
        ref={ref}
        role="menuitem"
        data-slot="dropdown-menu-item"
        data-variant={variant}
        onClick={() => setOpen(false)}
        className={cn(
          "relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          inset && "pl-7",
          variant === "destructive" && "text-destructive hover:bg-destructive/10 hover:text-destructive",
          className
        )}
        {...props} />);


  }
);
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {inset?: boolean;}>(
  ({ className, inset, ...props }, ref) =>
  <div ref={ref} data-slot="dropdown-menu-label" className={cn("px-1.5 py-1 text-xs font-medium text-muted-foreground", inset && "pl-7", className)} {...props} />

);
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="dropdown-menu-separator" className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />

);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenuShortcut = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) =>
  <span ref={ref} data-slot="dropdown-menu-shortcut" className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />

);
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

const DropdownMenuGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => <div ref={ref} data-slot="dropdown-menu-group" role="group" {...props} />
);
DropdownMenuGroup.displayName = "DropdownMenuGroup";

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup };