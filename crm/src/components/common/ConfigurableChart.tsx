import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { Card } from "@/components/ui/card";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";

import { Button } from "@/components/ui/button";
import {
  DataSourceEntityType,
  useDataSourceById,
} from "@/hooks/useDataSourceById";

import { groupBy } from "lodash";

import { toPrettyString } from "@/utils/common";

type ChartType = "line" | "bar" | "pie";

interface DataSourceMeta {
  name: string;
  id: string;
}

export interface DataSource {
  name: string;
  data: Record<string, unknown>[];
}

interface Props {
  getDataSources: () => Promise<DataSourceMeta[]>;
  config?: {
    chartType?: ChartType;
    dataSourceId?: DataSourceEntityType;
    xKey?: string;
    yKey?: string;
    labelKey?: string;
  }
}

const CHART_TYPES: ChartType[] = ["line", "bar", "pie"];

export const ConfigurableChart: React.FC<Props> = ({ getDataSources, config }) => {
  
  //  const [open, setOpen] = useQueryState(
  //   "chartConfigOpen",
  //   parseAsBoolean.withDefault(false)
  // );
  // const [chartType, setChartType] = useQueryState("chartType", parseAsString);
  // const [selectedDataSourceId, setDataSourceId] = useQueryState(
  //   "dataSourceId",
  //   parseAsString
  // );
  // const [xKey, setXKey] = useQueryState("xKey", parseAsString.withDefault(""));
  // const [yKey, setYKey] = useQueryState("yKey", parseAsString.withDefault(""));
  // const [labelKey, setLabelKey] = useQueryState(
  //   "labelKey",
  //   parseAsString.withDefault("")
  // );

  // URL state management with nuqs

  const [open, setOpen] = useState(false);
  const [chartType, setChartType] = useState<ChartType | null>(config?.chartType ?? null);
  const [selectedDataSourceId, setDataSourceId] =
    useState<DataSourceEntityType | null>(config?.dataSourceId ?? null);
  const [xKey, setXKey] = useState<string>(config?.xKey ?? '');
  const [yKey, setYKey] = useState<string>(config?.yKey ?? '');
  const [labelKey, setLabelKey] = useState<string>(config?.labelKey ?? '');

  // Use the hook with a safe default value
  // The useDataSourceById hook already handles null/undefined values safely
  const { data, isLoading, error } = useDataSourceById(
    (selectedDataSourceId || 'LEAD') as DataSourceEntityType
  );

  const [dataSourcesMeta, setDataSourcesMeta] = useState<DataSourceMeta[]>([]);

  const [loadingSourcesMeta, setLoadingSourcesMeta] = useState(false);

  const keys = useMemo(() => {
    return data?.data?.length ? Object.keys(data.data[0]) : [];
  }, [data]);

  useEffect(() => {
    if (chartType && dataSourcesMeta.length === 0) {
      setLoadingSourcesMeta(true);
      getDataSources()
        .then(setDataSourcesMeta)
        .finally(() => setLoadingSourcesMeta(false));
    }
  }, [chartType, dataSourcesMeta.length, getDataSources]);

  const handleChartTypeChange = async (val: ChartType) => {
    // When changing chart type, reset all other selections
    await setChartType(val);
    await setDataSourceId(null);
    await setXKey("");
    await setYKey("");
    await setLabelKey("");
    // setSelectedSourceMeta(null);
  };

  const handleSourceChange = async (id: DataSourceEntityType) => {
    setDataSourceId(id);
    // Reset keys when data source changes
    setXKey("");
    setYKey("");
    setLabelKey("");
  };

  const renderChart = () => {
    if (!chartType || !data || !xKey || !yKey) return null;

    const groupByXKey = groupBy(data.data, xKey);
    const dataAggregatedByYKey = Object.entries(groupByXKey).map(
      ([xValue, group]) => ({
        [xKey]: xValue,
        [yKey]: group.reduce((total, item) => {
          const value = (item as Record<string, unknown>)[yKey];
          return (
            (total as number) +
            (typeof value === "number" ? value : (0 as number))
          );
        }, 0),
      })
    );
   
    const chartData = dataAggregatedByYKey;

    switch (chartType) {
      case "line":
        return (
          <LineChart width={500} height={300} data={chartData}>
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={yKey} stroke="#8884d8" />
          </LineChart>
        );
      case "bar":
        return (
          <BarChart width={500} height={300} data={chartData}>
            <XAxis
              className="capitalize"
              dataKey={xKey}
              tickFormatter={(value) => toPrettyString(value)} // Format X-axis labels
            />
            <YAxis />
            <Tooltip />
            <Legend
              formatter={(value) => (
                <span className="capitalize">{toPrettyString(value)}</span>
              )}
            />
            <Bar dataKey={yKey} fill="#82ca9d" />
          </BarChart>
        );
      case "pie":
        return (
          <PieChart width={400} height={300}>
            <Tooltip />
            <Legend />
            <Pie
              data={chartData}
              dataKey={yKey}
              nameKey={labelKey || xKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              label
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={["#8884d8", "#82ca9d", "#ffc658"][index % 3]}
                />
              ))}
            </Pie>
          </PieChart>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold capitalize">
          Chart - {xKey} : {yKey}
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Configure</Button>
          </DialogTrigger>
          <DialogContent className="space-y-4">
            <DialogHeader>
              <DialogTitle>Configure Chart</DialogTitle>
            </DialogHeader>

            <div>
              <label className="block mb-1 text-sm">Chart Type</label>
              <Select
                value={chartType || ""}
                onValueChange={handleChartTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chart type" />
                </SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {chartType && (
              <div>
                <label className="block mb-1 text-sm">Data Source</label>
                {loadingSourcesMeta ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={selectedDataSourceId || ""}
                    onValueChange={handleSourceChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      {dataSourcesMeta.map((ds) => (
                        <SelectItem key={ds.id} value={ds.id}>
                          {ds.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {isLoading && <Skeleton className="h-24 w-full" />}
            {error && (
              <p className="text-red-500">
                Failed to load data source. Please try again.
              </p>
            )}

            {data && keys.length > 0 && (
              <>
                <div>
                  <label className="block mb-1 text-sm">X-Axis Key</label>
                  <Select value={xKey} onValueChange={setXKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select X-axis key" />
                    </SelectTrigger>
                    <SelectContent>
                      {keys.map((key) => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block mb-1 text-sm">Y-Axis Key</label>
                  <Select value={yKey} onValueChange={setYKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Y-axis key" />
                    </SelectTrigger>
                    <SelectContent>
                      {keys.map((key) => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {chartType === "pie" && (
                  <div>
                    <label className="block mb-1 text-sm">
                      Label Key (Optional)
                    </label>
                    <Select value={labelKey} onValueChange={setLabelKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select label key" />
                      </SelectTrigger>
                      <SelectContent>
                        {keys.map((key) => (
                          <SelectItem key={key} value={key}>
                            {key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
      {renderChart() || (
        <p className="text-muted-foreground">No chart configured yet.</p>
      )}
    </Card>
  );
};
