import React, { ElementType, JSX, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TypographyVariant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "p"
  | "blockquote"
  | "table"
  | "ul"
  | "ol"
  | "li"
  | "inlineCode"
  | "lead"
  | "large"
  | "small"
  | "muted";

// A generic polymorphic component type
type TypographyProps<T extends ElementType = "p"> = {
  as?: T;
  variant?: TypographyVariant;
  className?: string;
  children?: ReactNode;
} & React.ComponentPropsWithoutRef<T>;

const variantMap: Record<TypographyVariant, keyof JSX.IntrinsicElements> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  p: "p",
  blockquote: "blockquote",
  table: "table",
  ul: "ul",
  ol: "ol",
  li: "li",
  inlineCode: "code",
  lead: "p",
  large: "div",
  small: "small",
  muted: "p",
};

const variantClasses: Record<TypographyVariant, string> = {
  h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-foreground",
  h2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 text-foreground",
  h3: "scroll-m-20 text-2xl font-semibold tracking-tight text-foreground",
  h4: "scroll-m-20 text-xl font-semibold tracking-tight text-foreground",
  p: "leading-7 text-base text-foreground",
  blockquote: "mt-6 border-l-2 pl-6 italic text-muted-foreground",
  table:
    "w-full text-sm text-left border border-border rounded-lg overflow-hidden",
  ul: "list-disc list-inside text-foreground",
  ol: "list-decimal list-inside text-foreground",
  li: "mb-1 text-foreground",
  inlineCode:
    "rounded bg-muted px-1 py-0.5 font-mono text-sm text-muted-foreground",
  lead: "text-xl text-muted-foreground",
  large: "text-lg font-semibold text-foreground",
  small: "text-sm font-medium text-muted-foreground",
  muted: "text-sm text-muted-foreground",
};

export const Typography = <T extends ElementType = "p">({
  as,
  variant = "p",
  className,
  children,
  ...props
}: TypographyProps<T>) => {
  const Component = as ?? variantMap[variant];

  return (
    <Component className={cn(variantClasses[variant], className)} {...props}>
      {children}
    </Component>
  );
};
