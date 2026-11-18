import React from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartPoint, wholeNumber } from "./chartData";
import ChartTooltip from "./ChartTooltip";

/** A single-series chart: the title names it, so it needs no legend. */
const CountChart: React.FC<{ data: ChartPoint[]; color: string }> = ({
  data,
  color,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "adminDashboard" });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip
          content={
            <ChartTooltip
              format={wholeNumber}
              colors={{ count: color }}
              showTotal={false}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="count"
          name={t("count")}
          stroke={color}
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default CountChart;
