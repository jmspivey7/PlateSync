"use client";

import * as React from "react";
import { TooltipProps } from "recharts";

export type ChartContext = {
  activeValue: number | string;
  config: ChartConfig;
};

export type ChartStyles = {
  [key: `--color-${string}`]: string;
} & React.CSSProperties;

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

// Chart container provides context values and styling to its children
export function ChartContainer({
  config,
  children,
  className,
  style,
  ...props
}: {
  config: ChartConfig;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
  // Custom CSS variables for chart colors
  const styles = React.useMemo(() => {
    const result: ChartStyles = {
      "--color-primary": "hsl(var(--primary))",
      "--color-secondary": "hsl(var(--secondary))",
      "--color-tertiary": "hsl(var(--muted))",
      "--color-quaternary": "hsl(var(--accent))",
      // Chart specific colors
      "--color-check": "hsl(var(--primary))",
      "--color-cash": "hsl(var(--accent))",
      ...style,
    };

    // Map the config colors to CSS variables
    Object.entries(config).forEach(([key, value], index) => {
      result[`--color-${key}`] = value.color;
      result[`--color-chart-${index + 1}`] = value.color;
    });

    return result;
  }, [config, style]);

  return (
    <div className={className} style={styles} {...props}>
      {children}
    </div>
  );
}

// Chart tooltip provides consistent styling for tooltips
export const ChartTooltip = ({
  active,
  payload,
  content,
  ...props
}: TooltipProps<any, any>) => {
  if (!active || !payload?.length) return null;
  
  if (content) return <>{content}</>;
  
  return <div>Default Tooltip</div>;
};

type ChartTooltipContentProps = {
  payload?: Array<{
    name: string;
    value: string | number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  indicator?: "line" | "dot";
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function ChartTooltipContent({
  payload,
  label,
  indicator = "line",
  className,
  ...props
}: ChartTooltipContentProps) {
  return (
    <div
      className={`rounded-lg border bg-background p-2 shadow-md ${className ?? ""}`}
      {...props}
    >
      {label && <div className="text-xs font-medium">{label}</div>}
      <div className="flex flex-col gap-0.5">
        {payload?.map(({ name, value, color, dataKey }, index) => (
          <div key={`item-${index}`} className="flex items-center gap-1 text-xs">
            {indicator === "line" ? (
              <div
                className="h-0.5 w-4"
                style={{
                  backgroundColor: color,
                }}
              />
            ) : (
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: color,
                }}
              />
            )}
            <span>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}