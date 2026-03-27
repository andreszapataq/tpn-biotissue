// Tipos compartidos para el módulo de informes

export interface ConsumptionData {
  product_id: string
  product_name: string
  product_code: string
  category: string
  total_consumed: number
  unit_price: number
  total_value: number
  procedures_count: number
  patients_count: number
}

export interface InventoryReport {
  product_id: string
  product_name: string
  product_code: string
  category: string
  current_stock: number
  minimum_stock: number
  unit_price: number
  stock_value: number
  status: "normal" | "low_stock" | "out_of_stock"
}

export interface ProcedureSummary {
  total_procedures: number
  total_value: number
  avg_value_per_procedure: number
  most_used_product: {
    name: string
    quantity: number
  }
}

export interface DeduplicatedProduct {
  canonical_id: string
  all_ids: string[]
  name: string
  code: string
  category: string
  aggregated_stock: number
  minimum_stock: number
  unit_price: number
}

export interface DateRangeResult {
  start: string
  end: string
  label: string
}

export type DateRangeType = "today" | "this_week" | "this_month" | "this_year" | "custom"

export interface ConsumptionResult {
  consumedProducts: ConsumptionData[]
  unusedProducts: ConsumptionData[]
  zeroPriceProducts: ConsumptionData[]
  summary: ProcedureSummary
  totalValue: number
}

export interface InventoryResult {
  withStock: InventoryReport[]
  outOfStock: InventoryReport[]
  totalValue: number
  lowStockCount: number
  highestStockProduct: { name: string; quantity: number }
  productsWithStockCount: number
}
