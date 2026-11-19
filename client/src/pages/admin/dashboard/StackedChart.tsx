import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartPoint, Series, seriesColor, SURFACE } from "./chartData";
import ChartTooltip from "./ChartTooltip";

const StackedChart: React.FC<{
  data: ChartPoint[];
  series: Series[];
  format: (value: number) => string;
  formatAxis?: (value: number) => string;
}> = ({ data, series, format, formatAxis = format }) => {
  const colors = Object.fromEntries(
    series.map(({ key }, index) => [key, seriesColor(index)])
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis tickFormatter={formatAxis} />
        <Tooltip content={<ChartTooltip format={format} colors={colors} />} />
        {/* Same stroke problem as the tooltip, so name the colors outright. */}
        <Legend
          payload={series.map(({ key, name }) => ({
            id: key,
            value: name,
            type: "square",
            color: colors[key],
          }))}
        />
        {series.map(({ key, name }) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            name={name}
            stackId="total"
            fill={colors[key]}
            fillOpacity={1}
            stroke={SURFACE}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default StackedChart;
