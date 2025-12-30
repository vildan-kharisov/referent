import * as React from "react";

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "destructive";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const baseStyles = "relative w-full rounded-lg border px-4 py-3 text-sm";
  const variantStyles = {
    default: "border-slate-800 bg-slate-950/60 text-slate-200",
    destructive: "border-rose-800/50 bg-rose-950/30 text-rose-200"
  };

  return (
    <div
      ref={ref}
      role="alert"
      className={`${baseStyles} ${variantStyles[variant]} ${className || ""}`}
      {...props}
    />
  );
});
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={`mb-1 font-medium leading-none tracking-tight ${className || ""}`}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm [&_p]:leading-relaxed ${className || ""}`}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };

