import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../utils";

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType>({
  open: false,
  setOpen: () => { /* empty */ }
});

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Dialog: React.FC<DialogProps> = ({ children, open, defaultOpen = false, onOpenChange }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const controlledOpen = open !== undefined ? open : isOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (open === undefined) setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <DialogContext.Provider value={{ open: controlledOpen, setOpen: handleOpenChange }}>
      {children}
    </DialogContext.Provider>);

};

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ onClick, asChild = false, ...props }, ref) => {
    const { setOpen } = React.useContext(DialogContext);
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        type="button"
        data-slot="dialog-trigger"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          setOpen(true);
          onClick?.(e);
        }}
        {...props} />);
  }
);
DialogTrigger.displayName = "DialogTrigger";

type DialogCloseProps = React.ButtonHTMLAttributes<HTMLButtonElement>

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps & { asChild?: boolean }>(
  ({ onClick, asChild = false, ...props }, ref) => {
    const { setOpen } = React.useContext(DialogContext);
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        type="button"
        data-slot="dialog-close"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          setOpen(false);
          onClick?.(e);
        }}
        {...props} />);
  }
);
DialogClose.displayName = "DialogClose";

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  showCloseButton?: boolean;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, showCloseButton = true, ...props }, ref) => {
    const { open, setOpen } = React.useContext(DialogContext);
    if (!open) return null;

    const content = (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
          onMouseDown={() => setOpen(false)} />
        
        <div
          ref={ref}
          data-slot="dialog-content"
          className={cn(
            "relative z-[101] flex flex-col w-full max-w-lg rounded-2xl bg-background p-6 shadow-2xl ring-1 ring-border animate-in fade-in zoom-in-95 duration-200",
            className
          )}
          {...props}>
          
          {children}
          {showCloseButton &&
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 transition-colors hover:text-slate-700 z-[100]">
            
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          }
        </div>
      </div>
    );

    return createPortal(content, document.body);
  }
);
DialogContent.displayName = "DialogContent";

const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) =>
  <div ref={ref} data-slot="dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />

);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) =>
  <div
    ref={ref}
    data-slot="dialog-footer"
    className={cn("-mx-6 -mb-6 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-6 sm:flex-row sm:justify-end", className)}
    {...props} />


);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) =>
  <h2 ref={ref} data-slot="dialog-title" className={cn("text-base leading-none font-medium", className)} {...props} />

);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) =>
  <p ref={ref} data-slot="dialog-description" className={cn("text-sm text-muted-foreground", className)} {...props} />

);
DialogDescription.displayName = "DialogDescription";

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose };