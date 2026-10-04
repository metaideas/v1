import { Badge } from "@v1/ui/components/badge"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@v1/ui/components/chart"
import { Checkbox } from "@v1/ui/components/checkbox"
import { DataTable, type DataTableProps } from "@v1/ui/components/data-table"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@v1/ui/components/table"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import ShowcaseDemo from "#features/showcase/components/showcase-demo.tsx"
import ShowcaseSection from "#features/showcase/components/showcase-section.tsx"
import {
  BROWSER_CHART_CONFIG,
  BROWSER_SHARE,
  EMPTY_PAYMENTS,
  INVOICES,
  MONTHLY_VISITORS,
  type Payment,
  PAYMENTS,
  VISITORS_CHART_CONFIG,
} from "#features/showcase/constants.ts"

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" })

function formatCurrency(amount: number) {
  return CURRENCY_FORMATTER.format(amount)
}

function formatMonth(value: string) {
  return value.slice(0, 3)
}

const PAYMENT_COLUMNS: DataTableProps<Payment>["columns"] = [
  {
    cell: ({ row }) => (
      <Checkbox
        aria-label="Select row"
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => {
          row.toggleSelected(checked)
        }}
      />
    ),
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        checked={table.getIsAllRowsSelected()}
        indeterminate={table.getIsSomeRowsSelected()}
        onCheckedChange={(checked) => {
          table.toggleAllRowsSelected(checked)
        }}
      />
    ),
    id: "select",
  },
  {
    accessorKey: "status",
    cell: ({ row }) => (
      <Badge
        className="capitalize"
        variant={row.original.status === "failed" ? "destructive" : "secondary"}
      >
        {row.original.status}
      </Badge>
    ),
    header: "Status",
  },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "amount",
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">
        {formatCurrency(row.original.amount)}
      </div>
    ),
    header: () => <div className="text-right">Amount</div>,
  },
]

export default function ShowcaseData() {
  return (
    <>
      <ShowcaseSection id="table">
        <Table>
          <TableCaption>A list of your recent invoices.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {INVOICES.map((invoice) => (
              <TableRow
                data-state={invoice.status === "Unpaid" ? "selected" : undefined}
                key={invoice.invoice}
              >
                <TableCell className="font-medium">{invoice.invoice}</TableCell>
                <TableCell>{invoice.status}</TableCell>
                <TableCell>{invoice.method}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(invoice.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(INVOICES.reduce((total, invoice) => total + invoice.amount, 0))}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </ShowcaseSection>

      <ShowcaseSection id="data-table">
        <ShowcaseDemo className="grid grid-cols-1" label="With row selection">
          <DataTable columns={PAYMENT_COLUMNS} data={PAYMENTS} />
        </ShowcaseDemo>
        <ShowcaseDemo className="grid grid-cols-1" label="Empty">
          <DataTable
            columns={PAYMENT_COLUMNS}
            data={EMPTY_PAYMENTS}
            emptyMessage="No payments yet."
          />
        </ShowcaseDemo>
      </ShowcaseSection>

      <ShowcaseSection
        description="Charts wrap Recharts with themed colors and tooltips."
        id="chart"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ShowcaseDemo className="grid grid-cols-1" label="Bar chart">
            <ChartContainer className="min-h-56 w-full" config={VISITORS_CHART_CONFIG}>
              <BarChart accessibilityLayer data={MONTHLY_VISITORS}>
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tickLine={false}
                  tickMargin={10}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
                <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
              </BarChart>
            </ChartContainer>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="Line chart">
            <ChartContainer className="min-h-56 w-full" config={VISITORS_CHART_CONFIG}>
              <LineChart
                accessibilityLayer
                data={MONTHLY_VISITORS}
                margin={{ left: 12, right: 12 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tickLine={false}
                  tickMargin={8}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={false} />
                <Line
                  dataKey="desktop"
                  dot={false}
                  stroke="var(--color-desktop)"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="mobile"
                  dot={false}
                  stroke="var(--color-mobile)"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ChartContainer>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="Stacked area chart">
            <ChartContainer className="min-h-56 w-full" config={VISITORS_CHART_CONFIG}>
              <AreaChart
                accessibilityLayer
                data={MONTHLY_VISITORS}
                margin={{ left: 12, right: 12 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis axisLine={false} tickCount={4} tickLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} cursor={false} />
                <Area
                  dataKey="mobile"
                  fill="var(--color-mobile)"
                  fillOpacity={0.4}
                  stackId="visitors"
                  stroke="var(--color-mobile)"
                  type="natural"
                />
                <Area
                  dataKey="desktop"
                  fill="var(--color-desktop)"
                  fillOpacity={0.4}
                  stackId="visitors"
                  stroke="var(--color-desktop)"
                  type="natural"
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="Donut chart">
            <ChartContainer
              className="mx-auto aspect-square max-h-64 w-full"
              config={BROWSER_CHART_CONFIG}
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
                <Pie data={BROWSER_SHARE} dataKey="visitors" innerRadius={56} nameKey="browser" />
                <ChartLegend content={<ChartLegendContent nameKey="browser" />} />
              </PieChart>
            </ChartContainer>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="Horizontal bar chart">
            <ChartContainer className="min-h-56 w-full" config={VISITORS_CHART_CONFIG}>
              <BarChart
                accessibilityLayer
                data={MONTHLY_VISITORS}
                layout="vertical"
                margin={{ left: -16 }}
              >
                <XAxis dataKey="desktop" hide type="number" />
                <YAxis
                  axisLine={false}
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tickLine={false}
                  tickMargin={10}
                  type="category"
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
                <Bar dataKey="desktop" fill="var(--color-desktop)" radius={5} />
              </BarChart>
            </ChartContainer>
          </ShowcaseDemo>
          <ShowcaseDemo className="grid grid-cols-1" label="Pie chart">
            <ChartContainer
              className="mx-auto aspect-square max-h-64 w-full"
              config={BROWSER_CHART_CONFIG}
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={BROWSER_SHARE} dataKey="visitors" label nameKey="browser" />
              </PieChart>
            </ChartContainer>
          </ShowcaseDemo>
        </div>
      </ShowcaseSection>
    </>
  )
}
