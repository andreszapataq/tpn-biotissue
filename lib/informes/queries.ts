import { supabase } from "@/lib/supabase"
import { getCurrentDateInColombia } from "@/lib/utils"
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { es } from "date-fns/locale"
import type {
  ConsumptionData,
  ConsumptionResult,
  DateRangeResult,
  DateRangeType,
  DeduplicatedProduct,
  InventoryReport,
  InventoryResult,
  ProcedureSummary,
} from "./types"

// ── Fecha con timezone Colombia ──────────────────────────────────────

export function getDateRange(
  rangeType: DateRangeType,
  customStart?: string,
  customEnd?: string
): DateRangeResult {
  const colombiaDateStr = getCurrentDateInColombia()
  // Parsear como mediodía Colombia para evitar problemas de timezone
  const now = new Date(colombiaDateStr + "T12:00:00-05:00")

  let start: string
  let end: string

  switch (rangeType) {
    case "today":
      start = colombiaDateStr
      end = colombiaDateStr
      break
    case "this_week":
      start = format(subDays(now, 7), "yyyy-MM-dd")
      end = colombiaDateStr
      break
    case "this_month":
      start = format(startOfMonth(now), "yyyy-MM-dd")
      end = format(endOfMonth(now), "yyyy-MM-dd")
      break
    case "this_year":
      start = format(startOfYear(now), "yyyy-MM-dd")
      end = format(endOfYear(now), "yyyy-MM-dd")
      break
    case "custom":
      start = customStart || colombiaDateStr
      end = customEnd || colombiaDateStr
      break
    default:
      start = format(startOfMonth(now), "yyyy-MM-dd")
      end = format(endOfMonth(now), "yyyy-MM-dd")
  }

  const startDate = new Date(start + "T12:00:00-05:00")
  const endDate = new Date(end + "T12:00:00-05:00")
  const label = `${format(startDate, "d MMM", { locale: es })} - ${format(endDate, "d MMM yyyy", { locale: es })}`

  return { start, end, label }
}

// ── Deduplicación de productos ───────────────────────────────────────

export function deduplicateProducts(
  products: Array<{
    id: string
    name: string
    code: string
    category: string
    stock: number | null
    minimum_stock: number | null
    unit_price: number | null
    is_archived: boolean | null
  }>
): Map<string, DeduplicatedProduct> {
  const codeMap = new Map<string, DeduplicatedProduct>()

  for (const p of products) {
    // Filtrar archivados
    if (p.is_archived) continue

    const existing = codeMap.get(p.code)
    if (existing) {
      existing.all_ids.push(p.id)
      existing.aggregated_stock += p.stock || 0
      existing.minimum_stock = Math.max(existing.minimum_stock, p.minimum_stock || 0)
      // Preferir el precio no-cero más alto
      if ((p.unit_price || 0) > existing.unit_price) {
        existing.unit_price = p.unit_price || 0
      }
      // Si este row tiene más stock, usarlo como canónico
      if ((p.stock || 0) > 0 && existing.canonical_id !== p.id) {
        const existingProduct = products.find(pr => pr.id === existing.canonical_id)
        if (!existingProduct || (existingProduct.stock || 0) < (p.stock || 0)) {
          existing.canonical_id = p.id
        }
      }
    } else {
      codeMap.set(p.code, {
        canonical_id: p.id,
        all_ids: [p.id],
        name: p.name,
        code: p.code,
        category: p.category,
        aggregated_stock: p.stock || 0,
        minimum_stock: p.minimum_stock || 0,
        unit_price: p.unit_price || 0,
      })
    }
  }

  return codeMap
}

// ── Consumo ──────────────────────────────────────────────────────────

export async function loadConsumptionData(
  institutionId: string,
  dateRange: DateRangeResult
): Promise<ConsumptionResult> {
  const { start, end } = dateRange

  // Query 1: Procedimientos del período
  const { data: allProcedures, error: procError } = await supabase
    .from("procedures")
    .select("id, patient_id")
    .eq("institution_id", institutionId)
    .gte("created_at", `${start}T00:00:00`)
    .lte("created_at", `${end}T23:59:59`)

  if (procError) throw procError
  const totalProceduresInPeriod = allProcedures?.length || 0

  // Query 2: Movimientos de salida del período
  const { data: movements, error: movError } = await supabase
    .from("inventory_movements")
    .select(`
      *,
      product:inventory_products(id, name, code, category, unit_price, is_archived)
    `)
    .eq("institution_id", institutionId)
    .eq("movement_type", "out")
    .gte("created_at", `${start}T00:00:00`)
    .lte("created_at", `${end}T23:59:59`)

  if (movError) throw movError

  // Query 3: Todos los productos para deduplicar y mostrar sin uso
  const { data: allProducts, error: allProdError } = await supabase
    .from("inventory_products")
    .select("id, name, code, category, unit_price, stock, minimum_stock, is_archived")
    .eq("institution_id", institutionId)

  if (allProdError) throw allProdError

  // Deduplicar productos
  const deduped = deduplicateProducts(allProducts || [])

  // Crear índice inverso: product_id → código deduplicado
  const idToCode = new Map<string, string>()
  for (const [code, dp] of deduped) {
    for (const id of dp.all_ids) {
      idToCode.set(id, code)
    }
  }

  // Agrupar movimientos por código de producto deduplicado
  const codeConsumption = new Map<string, {
    total_consumed: number
    total_value: number
    procedureIds: Set<string>
  }>()
  const allProcedureIdsFromMovements = new Set<string>()

  for (const mov of movements || []) {
    if (!mov.product_id || !mov.product) continue
    const code = idToCode.get(mov.product_id)
    if (!code) continue

    const dp = deduped.get(code)
    if (!dp) continue

    const quantity = Math.abs(mov.quantity)
    const unitPrice = dp.unit_price
    const value = quantity * unitPrice

    const existing = codeConsumption.get(code)
    if (existing) {
      existing.total_consumed += quantity
      existing.total_value += value
      if (mov.reference_type === "procedure" && mov.reference_id) {
        existing.procedureIds.add(mov.reference_id)
        allProcedureIdsFromMovements.add(mov.reference_id)
      }
    } else {
      const procIds = new Set<string>()
      if (mov.reference_type === "procedure" && mov.reference_id) {
        procIds.add(mov.reference_id)
        allProcedureIdsFromMovements.add(mov.reference_id)
      }
      codeConsumption.set(code, {
        total_consumed: quantity,
        total_value: value,
        procedureIds: procIds,
      })
    }
  }

  // Query 4 (BATCH): Obtener pacientes de TODOS los procedimientos de una vez
  const procedurePatientMap = new Map<string, string>()
  const allProcIds = [...allProcedureIdsFromMovements]

  if (allProcIds.length > 0) {
    // Supabase tiene límite en .in(), hacer en chunks de 100
    for (let i = 0; i < allProcIds.length; i += 100) {
      const chunk = allProcIds.slice(i, i + 100)
      const { data: procs } = await supabase
        .from("procedures")
        .select("id, patient_id")
        .eq("institution_id", institutionId)
        .in("id", chunk)

      for (const p of procs || []) {
        if (p.patient_id) {
          procedurePatientMap.set(p.id, p.patient_id)
        }
      }
    }
  }

  // Construir arrays de consumo
  const consumedProducts: ConsumptionData[] = []
  const zeroPriceProducts: ConsumptionData[] = []
  const unusedProducts: ConsumptionData[] = []
  let totalValue = 0

  for (const [code, dp] of deduped) {
    const consumption = codeConsumption.get(code)

    if (consumption && consumption.total_consumed > 0) {
      // Calcular pacientes únicos para este producto
      const uniquePatients = new Set<string>()
      for (const procId of consumption.procedureIds) {
        const patientId = procedurePatientMap.get(procId)
        if (patientId) uniquePatients.add(patientId)
      }

      const item: ConsumptionData = {
        product_id: dp.canonical_id,
        product_name: dp.name,
        product_code: dp.code,
        category: dp.category,
        total_consumed: consumption.total_consumed,
        unit_price: dp.unit_price,
        total_value: consumption.total_value,
        procedures_count: consumption.procedureIds.size,
        patients_count: uniquePatients.size,
      }

      if (dp.unit_price === 0) {
        zeroPriceProducts.push(item)
      } else {
        consumedProducts.push(item)
        totalValue += consumption.total_value
      }
    } else {
      unusedProducts.push({
        product_id: dp.canonical_id,
        product_name: dp.name,
        product_code: dp.code,
        category: dp.category,
        total_consumed: 0,
        unit_price: dp.unit_price,
        total_value: 0,
        procedures_count: 0,
        patients_count: 0,
      })
    }
  }

  // Ordenar: consumidos por valor desc, sin uso alfabéticamente
  consumedProducts.sort((a, b) => b.total_value - a.total_value)
  zeroPriceProducts.sort((a, b) => b.total_consumed - a.total_consumed)
  unusedProducts.sort((a, b) => a.product_name.localeCompare(b.product_name))

  const mostUsed = consumedProducts[0] || zeroPriceProducts[0]
  const summary: ProcedureSummary = {
    total_procedures: totalProceduresInPeriod,
    total_value: totalValue,
    avg_value_per_procedure: totalProceduresInPeriod > 0 ? totalValue / totalProceduresInPeriod : 0,
    most_used_product: mostUsed
      ? { name: mostUsed.product_name, quantity: mostUsed.total_consumed }
      : { name: "-", quantity: 0 },
  }

  return { consumedProducts, unusedProducts, zeroPriceProducts, summary, totalValue }
}

// ── Inventario ───────────────────────────────────────────────────────

export async function loadInventoryData(
  institutionId: string
): Promise<InventoryResult> {
  const { data: products, error } = await supabase
    .from("inventory_products")
    .select("id, name, code, category, stock, minimum_stock, unit_price, is_archived")
    .eq("institution_id", institutionId)

  if (error) throw error

  const deduped = deduplicateProducts(products || [])

  const withStock: InventoryReport[] = []
  const outOfStock: InventoryReport[] = []
  let totalValue = 0
  let lowStockCount = 0
  let maxStock = 0
  let highestStockProduct = { name: "-", quantity: 0 }

  for (const [, dp] of deduped) {
    const stockValue = dp.aggregated_stock * dp.unit_price
    totalValue += stockValue

    if (dp.aggregated_stock > maxStock) {
      maxStock = dp.aggregated_stock
      highestStockProduct = { name: dp.name, quantity: dp.aggregated_stock }
    }

    let status: InventoryReport["status"] = "normal"
    if (dp.aggregated_stock === 0) {
      status = "out_of_stock"
    } else if (dp.aggregated_stock <= dp.minimum_stock) {
      status = "low_stock"
      lowStockCount++
    }

    const item: InventoryReport = {
      product_id: dp.canonical_id,
      product_name: dp.name,
      product_code: dp.code,
      category: dp.category,
      current_stock: dp.aggregated_stock,
      minimum_stock: dp.minimum_stock,
      unit_price: dp.unit_price,
      stock_value: stockValue,
      status,
    }

    if (dp.aggregated_stock > 0) {
      withStock.push(item)
    } else {
      outOfStock.push(item)
    }
  }

  // Ordenar: stock bajo primero, luego por valor desc
  withStock.sort((a, b) => {
    if (a.status === "low_stock" && b.status !== "low_stock") return -1
    if (a.status !== "low_stock" && b.status === "low_stock") return 1
    return b.stock_value - a.stock_value
  })
  outOfStock.sort((a, b) => a.product_name.localeCompare(b.product_name))

  return {
    withStock,
    outOfStock,
    totalValue,
    lowStockCount,
    highestStockProduct,
    productsWithStockCount: withStock.length,
  }
}
