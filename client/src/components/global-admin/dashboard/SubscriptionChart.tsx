import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

interface SubscriptionChartProps {
  data: {
    name: string;
    trial: number;
    subscriber: number;
  }[];
  title: string;
  description?: string;
}

export default function SubscriptionChart({ data, title, description }: SubscriptionChartProps) {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="trial" name="Trials" fill="#69ad4c" />
            <Bar dataKey="subscriber" name="Subscribers" fill="#132433" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}