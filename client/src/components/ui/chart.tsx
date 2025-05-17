import * as React from "react"
import { TooltipProps, LegendProps } from "recharts"

type ChartTooltipProps<TValue, TName> = TooltipProps<TValue, TName>

export type ChartConfig = Record<string, { label: string; color: string }>

export interface ChartContext {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContext | null>(null)

export function useChartContext() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChartContext must be used within a ChartProvider")
  }

  return context
}

export function ChartContainer({
  config,
  children,
}: {
  config: ChartConfig
  children: React.ReactNode
}) {
  const value = React.useMemo(() => ({ config }), [config])

  return (
    <ChartContext.Provider value={value}>
      <div className="chart-container" style={createChartCssVariables(config)}>
        {children}
      </div>
    </ChartContext.Provider>
  )
}

export function ChartLegend({ className, ...props }: LegendProps) {
  return (
    <div
      className="recharts-default-legend"
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "1rem",
        marginTop: "1rem",
      }}
      data-testid="recharts-legend"
    >
      <ul
        className="recharts-default-legend"
        style={{
          padding: 0,
          margin: 0,
          textAlign: "center",
          display: "flex",
          gap: "1rem",
        }}
      >
        {props.payload?.map((entry, index) => (
          <li
            className="recharts-legend-item"
            key={`item-${index}`}
            style={{
              display: "inline-block",
              marginRight: 10,
            }}
          >
            <svg
              className="recharts-surface"
              width="16"
              height="16"
              viewBox="0 0 32 32"
              style={{
                display: "inline-block",
                verticalAlign: "middle",
                marginRight: 4,
              }}
            >
              <path
                fill={entry.color}
                cx="16"
                cy="16"
                className="recharts-symbols"
                type="circle"
                d="M16,0A16,16,0,1,1,-16,0A16,16,0,1,1,16,0"
                transform="translate(16, 16)"
              ></path>
            </svg>
            <span className="recharts-legend-item-text" style={{ color: entry.color }}>
              {entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function createChartCssVariables(config: ChartConfig) {
  const style: Record<string, string> = {}

  Object.entries(config).forEach(([key, value]) => {
    style[`--color-${key}`] = value.color
  })

  return style
}

export function ChartLegendContent() {
  const { config } = useChartContext()

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-4 text-sm"
      style={{ marginTop: "1rem" }}
    >
      {Object.entries(config).map(([key, { label, color }]) => (
        <div key={key} className="flex items-center gap-1.5">
          <div
            className="rounded-sm border"
            style={{ background: color, width: 12, height: 12 }}
          />
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

export function ChartTooltip({ className, ...props }: ChartTooltipProps<any, any>) {
  return <>{props.content}</>
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  hideLabel = false,
  valueFormatter,
  labelFormatter,
  ...props
}: {
  active?: boolean
  payload?: any[]
  label?: string
  className?: string
  hideLabel?: boolean
  valueFormatter?: (value: number) => string
  labelFormatter?: (label: string) => string
}) {
  const { config } = useChartContext()

  if (!active || !payload?.length) {
    return null
  }

  const formattedLabel = labelFormatter ? labelFormatter(label || "") : label

  return (
    <div
      className="rounded-lg border bg-background p-2 shadow-sm"
      style={{ backgroundColor: "white" }}
    >
      {!hideLabel && formattedLabel ? (
        <div className="mb-1 font-medium">{formattedLabel}</div>
      ) : null}
      <div className="flex flex-col gap-0.5">
        {payload.map((item, index) => {
          const formattedValue = valueFormatter
            ? valueFormatter(item.value)
            : item.value

          const itemConfig = config[item.dataKey]
          // Skip rendering if no configuration is found for this data key
          if (!itemConfig) return null

          const { label, color } = itemConfig

          return (
            <div key={index} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <div
                  className="rounded-sm border"
                  style={{ background: color, width: 12, height: 12 }}
                />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <span className="text-sm font-medium">{formattedValue}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}