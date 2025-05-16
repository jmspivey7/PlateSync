import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

interface LineChartProps {
  data: any[];
  title: string;
  description?: string;
  dataKeys: {
    key: string;
    name: string;
    color: string;
  }[];
  xAxisDataKey: string;
  yAxisFormatter?: (value: number) => string;
}

export default function LineChart({ 
  data, 
  title, 
  description, 
  dataKeys,
  xAxisDataKey,
  yAxisFormatter = (value) => `${value}` 
}: LineChartProps) {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsLineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisDataKey} />
            <YAxis tickFormatter={yAxisFormatter} />
            <Tooltip formatter={(value) => [yAxisFormatter(value as number)]} />
            <Legend />
            {dataKeys.map((dataKey) => (
              <Line
                key={dataKey.key}
                type="monotone"
                dataKey={dataKey.key}
                name={dataKey.name}
                stroke={dataKey.color}
                strokeWidth={2}
                activeDot={{ r: 8 }}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}