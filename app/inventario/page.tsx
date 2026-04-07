"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Search, Package, AlertTriangle, Plus, Minus, TrendingUp, Loader2, Check, ChevronsUpDown, CalendarIcon, Trash2, PackageX, X } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { supabase } from "@/lib/supabase"
import { Tables } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { InstitutionSwitcher } from "@/components/institutions/institution-switcher"
import { useInstitution } from "@/components/institutions/institution-provider"
import { usePermissions } from "@/hooks/use-permissions"
import { useAuth } from "@/components/auth/auth-provider"
import { formatTimestampForColombia, cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// 🇨🇴 Función para formatear moneda colombiana
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// 🔢 Función para formatear números con separador de miles
const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('es-CO').format(number)
}

type InventoryProduct = Tables<"inventory_products">

export default function Inventario() {
  const { user } = useAuth()
  const { selectedInstitutionId } = useInstitution()
  const [searchTerm, setSearchTerm] = useState("")
  const [inventory, setInventory] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null)
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0)
  const { toast } = useToast()

  // Estados para edición
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null)
  const permissions = usePermissions()

  // Formulario para nuevo producto
  const [newProduct, setNewProduct] = useState({
    name: "",
    code: "",
    category: "Apósitos",
    stock: 0,
    minimum_stock: 5,
    unit_price: 0,
  })
  const [unitPriceDisplay, setUnitPriceDisplay] = useState("")

  // Formulario para editar producto
  const [editProduct, setEditProduct] = useState({
    name: "",
    code: "",
    category: "Apósitos",
    stock: 0,
    minimum_stock: 5,
    unit_price: 0,
    lote: "",
  })
  const [editUnitPriceDisplay, setEditUnitPriceDisplay] = useState("")

  // Estados para entrada de inventario
  const [isStockEntryDialogOpen, setIsStockEntryDialogOpen] = useState(false)
  const [isProcessingEntry, setIsProcessingEntry] = useState(false)
  const [remision, setRemision] = useState("")
  const [currentEntry, setCurrentEntry] = useState({
    selectedProductCode: "",
    selectedProductName: "",
    selectedProductCategory: "",
    lote: "",
    expirationDate: "",
    quantity: 0,
    minimumStock: 5,
    unitPrice: 0,
    isNew: false,
  })
  const [pendingEntries, setPendingEntries] = useState<Array<{
    id: string
    productCode: string
    productName: string
    productCategory: string
    lote: string
    expirationDate: string
    quantity: number
    minimumStock: number
    unitPrice: number
    isNew: boolean
    existingProductId?: string
  }>>([])
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [expirationDateInput, setExpirationDateInput] = useState("")

  // Estados para historial de movimientos
  const [isMovementHistoryOpen, setIsMovementHistoryOpen] = useState(false)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<InventoryProduct | null>(null)
  const [movementHistory, setMovementHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Cargar productos desde la base de datos
  const loadInventory = async () => {
    try {
      setLoading(true)
      if (!selectedInstitutionId) {
        setInventory([])
        return
      }

      const { data, error } = await supabase
        .from("inventory_products")
        .select("*")
        .eq("institution_id", selectedInstitutionId)
        .order("name", { ascending: true })

      if (error) throw error

      setInventory(data || [])
    } catch (error: any) {
      console.error("Error loading inventory:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el inventario",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInventory()
  }, [selectedInstitutionId])

  // Crear nuevo producto
  const handleCreateProduct = async () => {
    try {
      setIsCreating(true)

      // Validar campos requeridos
      if (!newProduct.name.trim()) {
        throw new Error("El nombre del producto es requerido")
      }
      if (!newProduct.code.trim()) {
        throw new Error("El código del producto es requerido")
      }

      // Verificar que no exista un producto con el mismo código
      const { data: existingProducts, error: checkError } = await supabase
        .from("inventory_products")
        .select("id")
        .eq("code", newProduct.code.toUpperCase())
        .eq("institution_id", selectedInstitutionId || "")
        .is("lote", null)

      if (checkError) {
        console.error("Error checking for existing product:", checkError)
        throw new Error("Error al verificar productos existentes")
      }

      if (existingProducts && existingProducts.length > 0) {
        throw new Error(`Ya existe un producto con el código ${newProduct.code.toUpperCase()}`)
      }

      // Obtener perfil del usuario para registrar el movimiento
      let userProfile = null
      if (user?.id) {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .single()
        userProfile = userData
      }

      // Preparar datos del producto
      const productData = {
        name: newProduct.name.trim(),
        code: newProduct.code.trim().toUpperCase(),
        category: newProduct.category,
        institution_id: selectedInstitutionId || undefined,
        stock: newProduct.stock,
        minimum_stock: newProduct.minimum_stock,
        unit_price: newProduct.unit_price,
      }

      console.log("Creating product:", productData)

      const { data: createdProduct, error } = await supabase
        .from("inventory_products")
        .insert([productData])
        .select()
        .single()

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      // 🔧 REGISTRAR STOCK INICIAL EN HISTORIAL
      if (newProduct.stock > 0) {
        const movementData: any = {
          product_id: createdProduct.id,
          movement_type: "in",
          quantity: newProduct.stock,
          reference_type: "initial_stock",
          reference_id: null,
          institution_id: selectedInstitutionId || undefined,
          notes: `Inventario inicial del sistema`,
          created_at: new Date().toISOString()
        }

        if (userProfile?.id) {
          movementData.created_by = userProfile.id
        }

        const { error: movementError } = await supabase
          .from("inventory_movements")
          .insert([movementData])

        if (movementError) {
          console.error("Error registering initial stock movement:", movementError)
          // No mostrar error al usuario ya que el producto se creó correctamente
          // Solo registrar en consola para debugging
        }
      }

      toast({
        title: "Éxito",
        description: `Producto "${createdProduct.name}" creado correctamente${newProduct.stock > 0 ? ` con stock inicial de ${newProduct.stock} unidades` : ''}`,
      })

      setInventory([...inventory, createdProduct])
      setIsCreateDialogOpen(false)
      setNewProduct({
        name: "",
        code: "",
        category: "Apósitos",
        stock: 0,
        minimum_stock: 5,
        unit_price: 0,
      })
      setUnitPriceDisplay("")
    } catch (error: any) {
      console.error("Error creating product:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el producto",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Abrir diálogo de edición
  const openEditDialog = (product: InventoryProduct) => {
    setEditingProduct(product)
    setEditProduct({
      name: product.name,
      code: product.code,
      category: product.category,
      stock: product.stock || 0,
      minimum_stock: product.minimum_stock || 0,
      unit_price: product.unit_price || 0,
      lote: product.lote || "",
    })
    setEditUnitPriceDisplay(product.unit_price ? formatNumber(product.unit_price) : "")
    setIsEditDialogOpen(true)
  }

  // Actualizar producto
  const handleUpdateProduct = async () => {
    if (!editingProduct) return

    try {
      setIsUpdating(true)

      // Validar campos requeridos
      if (!editProduct.name.trim()) {
        throw new Error("El nombre del producto es requerido")
      }
      if (!editProduct.code.trim()) {
        throw new Error("El código del producto es requerido")
      }

      const oldStock = editingProduct.stock || 0
      const newStock = Number(editProduct.stock) || 0
      const stockChange = newStock - oldStock

      // Preparar datos con validación de tipos
      const productData = {
        name: editProduct.name.trim(),
        code: editProduct.code.trim().toUpperCase(),
        category: editProduct.category,
        stock: newStock,
        minimum_stock: Number(editProduct.minimum_stock) || 5,
        unit_price: Number(editProduct.unit_price) || 0,
        lote: editProduct.lote.trim() || null,
        updated_at: new Date().toISOString(),
      }

      console.log("Updating product:", productData)

      const { data, error } = await supabase
        .from("inventory_products")
        .update(productData)
        .eq("id", editingProduct.id)
        .select()
        .single()

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      // 🔧 NUEVO: Si cambió el stock, registrar movimiento
      if (stockChange !== 0) {
        // Obtener perfil del usuario
        let userProfile = null
        if (user?.id) {
          const { data: userData } = await supabase
            .from("users")
            .select("id")
            .eq("auth_id", user.id)
            .single()
          userProfile = userData
        }

        const movementData: any = {
          product_id: editingProduct.id,
          movement_type: stockChange > 0 ? "in" : "out",
          quantity: Math.abs(stockChange),
          reference_type: "manual_edit",
          reference_id: null,
          institution_id: selectedInstitutionId || undefined,
          notes: `Edición manual: ${oldStock} → ${newStock} unidades (${stockChange >= 0 ? '+' : ''}${stockChange})`
        }

        if (userProfile?.id) {
          movementData.created_by = userProfile.id
        }

        const { error: movementError } = await supabase
          .from("inventory_movements")
          .insert([movementData])

        if (movementError) {
          console.error("Error registering movement:", movementError)
          toast({
            title: "Advertencia",
            description: "Producto actualizado pero no se pudo registrar el movimiento de stock",
            variant: "destructive",
          })
        }
      }

      toast({
        title: "Éxito",
        description: stockChange !== 0 ? 
          `Producto actualizado. Stock: ${oldStock} → ${newStock}` :
          "Producto actualizado correctamente",
      })

      setInventory(inventory.map(item => item.id === editingProduct.id ? data : item))
      setIsEditDialogOpen(false)
      setEditingProduct(null)
      setEditProduct({
        name: "",
        code: "",
        category: "Apósitos",
        stock: 0,
        minimum_stock: 5,
        unit_price: 0,
        lote: "",
      })
    } catch (error: any) {
      console.error("Error updating product:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el producto",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // 🔧 ELIMINADO: handleStockAdjustment ya que se removieron botones +/- por seguridad  
  // Los ajustes de stock ahora solo se pueden hacer a través de:
  // 1. Edición del producto (con registro de movimiento)
  // 2. Entrada de inventario masiva  
  // 3. Uso en procedimientos (automático)

  // Filtrar inventario
  const filteredInventory = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const availableItems = filteredInventory.filter(
    (item) => (item.stock || 0) >= (item.minimum_stock || 0) && !item.is_archived
  )
  const lowStockItems = filteredInventory.filter(
    (item) => (item.stock || 0) > 0 && (item.stock || 0) < (item.minimum_stock || 0) && !item.is_archived
  )
  const outOfStockItems = filteredInventory.filter(
    (item) => (item.stock || 0) === 0 || item.is_archived
  )

  const getStockStatus = (stock: number, minimum: number) => {
    if (stock === 0) return { variant: "destructive" as const, label: "Agotado" }
    if (stock < minimum) return { variant: "destructive" as const, label: "Stock Bajo" }
    if (stock <= minimum * 1.5) return { variant: "secondary" as const, label: "Stock Medio" }
    return { variant: "default" as const, label: "Stock Normal" }
  }

  const totalProducts = new Set(inventory.map(item => item.code)).size
  const lowStockCount = inventory.filter(
    (item) => (item.stock || 0) > 0 && (item.stock || 0) < (item.minimum_stock || 0) && !item.is_archived
  ).length
  const outOfStockCount = inventory.filter(
    (item) => (item.stock || 0) === 0 || item.is_archived
  ).length
  const totalValue = inventory.reduce((sum, item) => sum + (item.stock || 0) * (item.unit_price || 0), 0)

  // Productos únicos por código para el combobox de búsqueda
  const uniqueProductsByCode = useMemo(() => {
    const map = new Map<string, { code: string; name: string; category: string; minimum_stock: number; unit_price: number }>()
    for (const product of inventory) {
      if (product.is_archived) continue
      if (!map.has(product.code)) {
        map.set(product.code, {
          code: product.code,
          name: product.name,
          category: product.category,
          minimum_stock: product.minimum_stock || 5,
          unit_price: product.unit_price || 0,
        })
      }
    }
    return Array.from(map.values())
  }, [inventory])

  const findExistingProduct = (code: string, lote: string) => {
    return inventory.find(
      p => p.code === code && p.lote === lote && !p.is_archived
    )
  }

  const checkIfNewCodeLote = (code: string, lote: string): boolean => {
    if (!code || !lote) return false
    return !findExistingProduct(code, lote)
  }

  const resetStockEntryDialog = () => {
    setRemision("")
    setCurrentEntry({
      selectedProductCode: "",
      selectedProductName: "",
      selectedProductCategory: "",
      lote: "",
      expirationDate: "",
      quantity: 0,
      minimumStock: 5,
      unitPrice: 0,
      isNew: false,
    })
    setPendingEntries([])
    setProductSearchOpen(false)
    setExpirationDateInput("")
    setIsStockEntryDialogOpen(false)
  }

  const handleAddEntry = () => {
    if (!currentEntry.selectedProductCode) {
      toast({ title: "Error", description: "Seleccione un producto", variant: "destructive" })
      return
    }
    if (!currentEntry.lote.trim()) {
      toast({ title: "Error", description: "Ingrese el lote", variant: "destructive" })
      return
    }
    if (currentEntry.quantity <= 0) {
      toast({ title: "Error", description: "La cantidad debe ser mayor a 0", variant: "destructive" })
      return
    }

    const duplicate = pendingEntries.find(
      e => e.productCode === currentEntry.selectedProductCode && e.lote === currentEntry.lote.trim()
    )
    if (duplicate) {
      toast({ title: "Error", description: "Ya existe una entrada pendiente con ese código y lote", variant: "destructive" })
      return
    }

    const existingProduct = findExistingProduct(currentEntry.selectedProductCode, currentEntry.lote.trim())
    const isNew = !existingProduct

    setPendingEntries(prev => [...prev, {
      id: crypto.randomUUID(),
      productCode: currentEntry.selectedProductCode,
      productName: currentEntry.selectedProductName,
      productCategory: currentEntry.selectedProductCategory,
      lote: currentEntry.lote.trim(),
      expirationDate: currentEntry.expirationDate,
      quantity: currentEntry.quantity,
      minimumStock: isNew ? currentEntry.minimumStock : (existingProduct?.minimum_stock || 0),
      unitPrice: isNew ? currentEntry.unitPrice : (existingProduct?.unit_price || 0),
      isNew,
      existingProductId: existingProduct?.id,
    }])

    setCurrentEntry({
      selectedProductCode: "",
      selectedProductName: "",
      selectedProductCategory: "",
      lote: "",
      expirationDate: "",
      quantity: 0,
      minimumStock: 5,
      unitPrice: 0,
      isNew: false,
    })
    setExpirationDateInput("")
  }

  const handleProcessEntries = async () => {
    try {
      setIsProcessingEntry(true)

      if (!remision.trim()) {
        toast({ title: "Error", description: "Ingrese el número de remisión", variant: "destructive" })
        setIsProcessingEntry(false)
        return
      }

      if (pendingEntries.length === 0) {
        toast({ title: "Error", description: "No hay entradas pendientes", variant: "destructive" })
        setIsProcessingEntry(false)
        return
      }

      let userProfile = null
      if (user?.id) {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .single()
        userProfile = userData
      }

      const movements: any[] = []
      let newProductsCreated = 0
      let existingProductsUpdated = 0

      for (const entry of pendingEntries) {
        if (entry.isNew) {
          // Verificar si mientras tanto alguien creó el mismo code+lote
          const { data: existingCheck } = await supabase
            .from("inventory_products")
            .select("id, stock")
            .eq("code", entry.productCode)
            .eq("lote", entry.lote)
            .eq("institution_id", selectedInstitutionId!)
            .maybeSingle()

          if (existingCheck) {
            // Ya existe — actualizar en vez de crear
            const newStock = (existingCheck.stock || 0) + entry.quantity
            const { error: updateError } = await supabase
              .from("inventory_products")
              .update({
                stock: newStock,
                expiration_date: entry.expirationDate || null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingCheck.id)

            if (updateError) throw updateError

            setInventory(prev => prev.map(p =>
              p.id === existingCheck.id
                ? { ...p, stock: newStock, expiration_date: entry.expirationDate || p.expiration_date }
                : p
            ))

            const movementData: any = {
              product_id: existingCheck.id,
              movement_type: "in",
              quantity: entry.quantity,
              reference_type: "stock_entry",
              institution_id: selectedInstitutionId || undefined,
              notes: `Remisión ${remision.trim()} - Lote: ${entry.lote}`,
            }
            if (userProfile?.id) movementData.created_by = userProfile.id
            movements.push(movementData)
            existingProductsUpdated++
          } else {
            // Crear nuevo producto
            const productData: any = {
              name: entry.productName,
              code: entry.productCode,
              category: entry.productCategory,
              lote: entry.lote,
              expiration_date: entry.expirationDate || null,
              stock: entry.quantity,
              minimum_stock: entry.minimumStock,
              unit_price: entry.unitPrice,
              institution_id: selectedInstitutionId || undefined,
            }

            const { data: createdProduct, error: createError } = await supabase
              .from("inventory_products")
              .insert([productData])
              .select()
              .single()

            if (createError) throw createError

            setInventory(prev => [...prev, createdProduct])

            const movementData: any = {
              product_id: createdProduct.id,
              movement_type: "in",
              quantity: entry.quantity,
              reference_type: "stock_entry",
              institution_id: selectedInstitutionId || undefined,
              notes: `Remisión ${remision.trim()} [Lote: ${entry.lote}]`,
            }
            if (userProfile?.id) movementData.created_by = userProfile.id
            movements.push(movementData)
            newProductsCreated++
          }
        } else {
          // Producto existente — re-consultar stock fresco
          const { data: freshProduct, error: fetchError } = await supabase
            .from("inventory_products")
            .select("stock")
            .eq("id", entry.existingProductId!)
            .single()

          if (fetchError) throw fetchError

          const newStock = (freshProduct?.stock || 0) + entry.quantity

          const updateData: any = {
            stock: newStock,
            updated_at: new Date().toISOString(),
          }
          if (entry.expirationDate) {
            updateData.expiration_date = entry.expirationDate
          }

          const { error: updateError } = await supabase
            .from("inventory_products")
            .update(updateData)
            .eq("id", entry.existingProductId!)

          if (updateError) throw updateError

          setInventory(prev => prev.map(p =>
            p.id === entry.existingProductId
              ? { ...p, stock: newStock, expiration_date: entry.expirationDate || p.expiration_date }
              : p
          ))

          const movementData: any = {
            product_id: entry.existingProductId,
            movement_type: "in",
            quantity: entry.quantity,
            reference_type: "stock_entry",
            institution_id: selectedInstitutionId || undefined,
            notes: `Remisión ${remision.trim()} [Lote: ${entry.lote}]`,
          }
          if (userProfile?.id) movementData.created_by = userProfile.id
          movements.push(movementData)
          existingProductsUpdated++
        }
      }

      if (movements.length > 0) {
        const { error: movementError } = await supabase
          .from("inventory_movements")
          .insert(movements)

        if (movementError) {
          console.error("Error registering movements:", movementError)
          toast({
            title: "Advertencia",
            description: "Stocks actualizados pero algunos movimientos no se registraron",
            variant: "destructive",
          })
        }
      }

      const parts = []
      if (newProductsCreated > 0) parts.push(`${newProductsCreated} nuevo(s)`)
      if (existingProductsUpdated > 0) parts.push(`${existingProductsUpdated} actualizado(s)`)
      toast({
        title: "Entrada procesada",
        description: `Remisión ${remision.trim()}: ${parts.join(", ")}`,
      })

      resetStockEntryDialog()

    } catch (error: any) {
      console.error("Error processing stock entry:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar la entrada de inventario",
        variant: "destructive",
      })
    } finally {
      setIsProcessingEntry(false)
    }
  }

  // 🔧 CORREGIDO: Función para cargar historial de movimientos con nombres actuales de pacientes
  const loadMovementHistory = async (productId: string) => {
    try {
      setLoadingHistory(true)
      
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*")
        .eq("institution_id", selectedInstitutionId || "")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(50)
      
      if (error) {
        console.error("Supabase error:", error)
        throw error
      }
      
      // Procesar movimientos para obtener nombres actuales de pacientes
      const processedMovements = await Promise.all((data || []).map(async (movement) => {
        // Si es un movimiento de procedimiento, obtener el nombre actual del paciente
        if (movement.reference_type === "procedure" && movement.reference_id) {
          try {
            const { data: procedureData } = await supabase
              .from("procedures")
              .select(`
                id,
                patient:patients(name)
              `)
              .eq("institution_id", selectedInstitutionId || "")
              .eq("id", movement.reference_id)
              .single()
            
            if (procedureData?.patient?.name) {
              // Actualizar las notas con el nombre actual del paciente
              const originalNotes = movement.notes || ""
              
              // Detectar si es "Usado en procedimiento" o "Insumo adicional"
              if (originalNotes.includes("Usado en procedimiento")) {
                movement.notes = `Usado en procedimiento - Paciente: ${procedureData.patient.name}`
              } else if (originalNotes.includes("Insumo adicional")) {
                movement.notes = `Insumo adicional - Paciente: ${procedureData.patient.name}`
              }
            }
          } catch (procedureError) {
            console.warn("Could not fetch procedure data for movement:", movement.id, procedureError)
            // Mantener las notas originales si no se puede obtener el procedimiento
          }
        }
        
        return movement
      }))
      
      console.log("Movement history loaded with updated patient names:", processedMovements)
      setMovementHistory(processedMovements)
    } catch (error) {
      console.error("Error loading movement history:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de movimientos",
        variant: "destructive",
      })
    } finally {
      setLoadingHistory(false)
    }
  }

  // Función para abrir historial de un producto
  const openMovementHistory = (product: InventoryProduct) => {
    setSelectedProductForHistory(product)
    setIsMovementHistoryOpen(true)
    loadMovementHistory(product.id)
  }


  return (
    <ProtectedRoute requiredRole={["administrador", "soporte", "asistente"]}>
      <div className="page-shell">
        <div className="page-container-medium">
          {/* Header */}
          <PageHeader
            title="Gestión de Inventario"
            subtitle="Control de stock de productos NPWT"
            backHref="/"
            actions={<InstitutionSwitcher />}
          />

          <div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold animate-count-up">{formatNumber(totalProducts)}</div>
                  <p className="text-xs text-muted-foreground">Tipos de productos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning animate-count-up">{formatNumber(lowStockCount)}</div>
                  <p className="text-xs text-muted-foreground">Requieren reposición</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {permissions.isAdmin ? "Valor Total" : "Sin Stock"}
                  </CardTitle>
                  {permissions.isAdmin
                    ? <TrendingUp className="h-4 w-4 text-success" />
                    : <PackageX className="h-4 w-4 text-destructive" />
                  }
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold animate-count-up">
                    {permissions.isAdmin
                      ? formatCurrency(totalValue)
                      : formatNumber(outOfStockCount)
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {permissions.isAdmin ? "Valor del inventario" : "Agotados o archivados"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Acciones</CardTitle>
                  <Plus className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  {permissions.canEditInventory ? (
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="w-full h-10 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
                          <Plus className="h-4 w-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">Nuevo Producto</span>
                        </Button>
                      </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crear Nuevo Producto</DialogTitle>
                        <DialogDescription>Agregar un nuevo producto al inventario</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="code">Código</Label>
                          <Input
                            id="code"
                            value={newProduct.code}
                            onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value.toUpperCase() })}
                            placeholder="Ej: ATPV"
                          />
                        </div>
                        <div>
                          <Label htmlFor="name">Nombre del Producto</Label>
                          <Input
                            id="name"
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                            placeholder="Ej: Multidress"
                          />
                        </div>
                        <div>
                          <Label htmlFor="category">Categoría</Label>
                          <Select
                            value={newProduct.category}
                            onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Apósitos">Apósitos</SelectItem>
                              <SelectItem value="Accesorios">Accesorios</SelectItem>
                              <SelectItem value="Canisters">Canisters</SelectItem>
                              <SelectItem value="Tubos">Tubos</SelectItem>
                              <SelectItem value="Otros">Otros</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="stock">Stock Inicial</Label>
                            <Input
                              id="stock"
                              type="number"
                              value={newProduct.stock}
                              onChange={(e) =>
                                setNewProduct({ ...newProduct, stock: Number.parseInt(e.target.value) || 0 })
                              }
                              min="0"
                            />
                          </div>
                          <div>
                            <Label htmlFor="minimum_stock">Stock Mínimo</Label>
                            <Input
                              id="minimum_stock"
                              type="number"
                              value={newProduct.minimum_stock}
                              onChange={(e) =>
                                setNewProduct({ ...newProduct, minimum_stock: Number.parseInt(e.target.value) || 0 })
                              }
                              min="0"
                            />
                          </div>
                        </div>
                        {/* Solo mostrar precio unitario para administradores */}
                        {permissions.isAdmin && (
                          <div>
                            <Label htmlFor="unit_price">Precio Unitario (COP)</Label>
                            <Input
                              id="unit_price"
                              type="text"
                              inputMode="numeric"
                              placeholder="0"
                              value={unitPriceDisplay}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\./g, "")
                                if (raw === "" || /^\d+$/.test(raw)) {
                                  const num = Number(raw) || 0
                                  setUnitPriceDisplay(raw === "" ? "" : formatNumber(num))
                                  setNewProduct({ ...newProduct, unit_price: num })
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCreateProduct}
                          disabled={isCreating || !newProduct.name || !newProduct.code}
                        >
                          {isCreating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creando...
                            </>
                          ) : (
                            "Crear Producto"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-sm text-muted-foreground">Solo administradores</p>
                      <p className="text-xs text-muted-foreground">pueden crear productos</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-9"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* 🔧 NUEVO: Botón Entrada de Inventario */}
              {permissions.canAdjustStock && (
                <Dialog open={isStockEntryDialogOpen} onOpenChange={(open) => {
                  if (!open) resetStockEntryDialog()
                  else setIsStockEntryDialogOpen(true)
                }}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="whitespace-nowrap">
                      <Package className="h-4 w-4 mr-2" />
                      Entrada de Inventario
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Entrada de Inventario</DialogTitle>
                      <DialogDescription>
                        Registrar nuevas existencias que llegan a la bodega
                      </DialogDescription>
                    </DialogHeader>

                    {/* Campo Remisión */}
                    <div className="space-y-2">
                      <Label htmlFor="remision">Remisión *</Label>
                      <Input
                        id="remision"
                        placeholder="Número de remisión"
                        value={remision}
                        onChange={(e) => setRemision(e.target.value)}
                      />
                    </div>

                    <Separator />

                    {/* Formulario de entrada */}
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-foreground">Agregar producto</p>

                      {/* Combobox búsqueda de producto */}
                      <div className="space-y-2">
                        <Label>Producto (código o nombre) *</Label>
                        <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={productSearchOpen}
                              className="w-full justify-between font-normal"
                            >
                              {currentEntry.selectedProductCode
                                ? `${currentEntry.selectedProductCode} - ${currentEntry.selectedProductName}`
                                : "Buscar producto por código o nombre..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                            <Command>
                              <CommandInput placeholder="Buscar producto..." />
                              <CommandList className="max-h-60 overflow-y-auto overscroll-contain">
                                <CommandEmpty>No se encontró el producto.</CommandEmpty>
                                <CommandGroup>
                                  {uniqueProductsByCode.map((product) => (
                                    <CommandItem
                                      key={product.code}
                                      value={`${product.code} ${product.name}`}
                                      onSelect={() => {
                                        const isNew = checkIfNewCodeLote(product.code, currentEntry.lote)
                                        setCurrentEntry(prev => ({
                                          ...prev,
                                          selectedProductCode: product.code,
                                          selectedProductName: product.name,
                                          selectedProductCategory: product.category,
                                          isNew,
                                          minimumStock: product.minimum_stock,
                                          unitPrice: product.unit_price,
                                        }))
                                        setProductSearchOpen(false)
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4",
                                        currentEntry.selectedProductCode === product.code ? "opacity-100" : "opacity-0"
                                      )} />
                                      <span className="font-medium">{product.code}</span>
                                      <span className="ml-2 text-muted-foreground truncate">{product.name}</span>
                                      <Badge variant="secondary" className="ml-auto text-xs">{product.category}</Badge>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Lote y Fecha de vencimiento */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="entry-lote">Lote *</Label>
                          <Input
                            id="entry-lote"
                            placeholder="Número de lote"
                            value={currentEntry.lote}
                            onChange={(e) => {
                              const lote = e.target.value
                              const isNew = checkIfNewCodeLote(currentEntry.selectedProductCode, lote.trim())
                              const baseProduct = uniqueProductsByCode.find(p => p.code === currentEntry.selectedProductCode)
                              setCurrentEntry(prev => ({
                                ...prev,
                                lote,
                                isNew,
                                ...(isNew && baseProduct ? { minimumStock: baseProduct.minimum_stock, unitPrice: baseProduct.unit_price } : {}),
                              }))
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fecha de vencimiento</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="dd/mm/aaaa"
                              value={expirationDateInput}
                              onChange={(e) => {
                                let val = e.target.value
                                // Auto-insert slashes
                                const digits = val.replace(/\D/g, "")
                                if (digits.length <= 2) val = digits
                                else if (digits.length <= 4) val = `${digits.slice(0, 2)}/${digits.slice(2)}`
                                else val = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
                                setExpirationDateInput(val)
                                // Parse dd/mm/yyyy → ISO
                                if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
                                  const [dd, mm, yyyy] = val.split("/")
                                  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
                                  if (date.getDate() === Number(dd) && date.getMonth() === Number(mm) - 1 && date.getFullYear() === Number(yyyy)) {
                                    const iso = `${yyyy}-${mm}-${dd}`
                                    setCurrentEntry(prev => ({ ...prev, expirationDate: iso }))
                                  } else {
                                    setCurrentEntry(prev => ({ ...prev, expirationDate: "" }))
                                  }
                                } else {
                                  setCurrentEntry(prev => ({ ...prev, expirationDate: "" }))
                                }
                              }}
                              maxLength={10}
                              className="flex-1"
                            />
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" className="shrink-0">
                                  <CalendarIcon className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                  mode="single"
                                  selected={currentEntry.expirationDate ? new Date(currentEntry.expirationDate + "T00:00:00") : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      const iso = date.toISOString().split("T")[0]
                                      setCurrentEntry(prev => ({ ...prev, expirationDate: iso }))
                                      const dd = String(date.getDate()).padStart(2, "0")
                                      const mm = String(date.getMonth() + 1).padStart(2, "0")
                                      const yyyy = date.getFullYear()
                                      setExpirationDateInput(`${dd}/${mm}/${yyyy}`)
                                    }
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>

                      {/* Cantidad */}
                      <div className="space-y-2">
                        <Label htmlFor="entry-quantity">Cantidad *</Label>
                        <Input
                          id="entry-quantity"
                          type="number"
                          min="1"
                          placeholder="Cantidad a ingresar"
                          value={currentEntry.quantity || ""}
                          onChange={(e) => setCurrentEntry(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                        />
                      </div>

                      {/* Campos adicionales para producto nuevo */}
                      {currentEntry.isNew && currentEntry.selectedProductCode && currentEntry.lote.trim() && (
                        <div className="space-y-4 p-4 border border-info/30 rounded-lg bg-info-muted/50">
                          <Badge variant="secondary" className="bg-info-muted text-info-foreground">
                            Nuevo producto
                          </Badge>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="entry-min-stock">Stock Mínimo</Label>
                              <Input
                                id="entry-min-stock"
                                type="number"
                                min="0"
                                value={currentEntry.minimumStock}
                                onChange={(e) => setCurrentEntry(prev => ({ ...prev, minimumStock: parseInt(e.target.value) || 0 }))}
                              />
                            </div>
                            {permissions.isAdmin && (
                              <div className="space-y-2">
                                <Label htmlFor="entry-price">Precio Unitario (COP)</Label>
                                <Input
                                  id="entry-price"
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="0"
                                  value={currentEntry.unitPrice ? currentEntry.unitPrice.toLocaleString("es-CO") : ""}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/\./g, "").replace(/,/g, "")
                                    if (/^\d*$/.test(raw)) {
                                      setCurrentEntry(prev => ({ ...prev, unitPrice: parseInt(raw) || 0 }))
                                    }
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Botón Agregar */}
                      <Button
                        variant="secondary"
                        onClick={handleAddEntry}
                        className="w-full"
                        disabled={!currentEntry.selectedProductCode || !currentEntry.lote.trim() || currentEntry.quantity <= 0}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar entrada
                      </Button>
                    </div>

                    {/* Lista de entradas pendientes */}
                    {pendingEntries.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-foreground">
                            Entradas pendientes ({pendingEntries.length})
                          </p>
                          <ScrollArea className="max-h-48">
                            <div className="space-y-2">
                              {pendingEntries.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium text-sm truncate">{entry.productName}</span>
                                      <Badge variant="outline" className="text-xs">{entry.productCode}</Badge>
                                      <Badge variant="secondary" className="text-xs">Lote: {entry.lote}</Badge>
                                      <Badge variant="default" className="text-xs">+{entry.quantity}</Badge>
                                      {entry.isNew ? (
                                        <Badge className="bg-info-muted text-info-foreground text-xs">Nuevo</Badge>
                                      ) : (
                                        <Badge variant="success" className="text-xs">Existente</Badge>
                                      )}
                                    </div>
                                    {entry.expirationDate && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Vence: {format(new Date(entry.expirationDate + "T00:00:00"), "PPP", { locale: es })}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPendingEntries(prev => prev.filter(e => e.id !== entry.id))}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </>
                    )}

                    <DialogFooter>
                      <Button variant="outline" onClick={resetStockEntryDialog}>
                        Cancelar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={isProcessingEntry || pendingEntries.length === 0 || !remision.trim()}
                          >
                            {isProcessingEntry ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Procesando...
                              </>
                            ) : (
                              `Procesar ${pendingEntries.length} entrada(s)`
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar entrada de inventario</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se procesarán {pendingEntries.length} entrada(s) con remisión <strong className="text-foreground">{remision}</strong>.
                              {pendingEntries.some(e => e.isNew) && (
                                <> Se crearán {pendingEntries.filter(e => e.isNew).length} producto(s) nuevo(s).</>
                              )}
                              {" "}Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleProcessEntries}>
                              Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Inventory Tabs */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="disponibles" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="disponibles" className="text-xs sm:text-sm">Disponibles ({formatNumber(availableItems.length)})</TabsTrigger>
                <TabsTrigger value="bajo-stock" className="text-xs sm:text-sm">Stock Bajo ({formatNumber(lowStockItems.length)})</TabsTrigger>
                <TabsTrigger value="sin-stock" className="text-xs sm:text-sm">Sin Stock ({formatNumber(outOfStockItems.length)})</TabsTrigger>
              </TabsList>

              {/* Tab: Disponibles — stock > mínimo, no archivado */}
              <TabsContent value="disponibles" className="space-y-4">
                {availableItems.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No hay productos disponibles con stock normal</p>
                      <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Primer Producto
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {availableItems.map((item) => {
                      const status = getStockStatus(item.stock || 0, item.minimum_stock || 0)
                      return (
                        <Card key={item.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold">{item.name}</h3>
                                  <Badge variant="outline">{item.code}</Badge>
                                  <Badge variant="secondary">{item.category}</Badge>
                                  {permissions.isAdmin && <Badge variant={status.variant}>{status.label}</Badge>}
                                </div>
                                <div className={`grid gap-4 text-sm text-muted-foreground ${permissions.isAdmin ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
                                  <div>
                                    <span className="font-medium">Lote:</span> <span className={`font-semibold ${item.lote ? 'text-primary' : 'text-muted-foreground'}`}>{item.lote || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium">Stock Actual:</span> {formatNumber(item.stock || 0)}
                                  </div>
                                  <div>
                                    <span className="font-medium">Stock Mínimo:</span> {formatNumber(item.minimum_stock || 0)}
                                  </div>
                                  {permissions.isAdmin ? (
                                    <>
                                      <div>
                                        <span className="font-medium">Precio Unitario:</span> {formatCurrency(item.unit_price || 0)}
                                      </div>
                                      <div>
                                        <span className="font-medium">Valor Total:</span> {formatCurrency((item.stock || 0) * (item.unit_price || 0))}
                                      </div>
                                    </>
                                  ) : (
                                    <div>
                                      <span className="font-medium">Estado:</span>
                                      <Badge variant={status.variant} className="ml-1">
                                        {status.label}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {permissions.canEditInventory && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(item)}
                                    className="mr-2"
                                  >
                                    Editar
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openMovementHistory(item)}
                                  className="mr-2"
                                >
                                  📊 Historial
                                </Button>
                                <span className="w-12 text-center font-medium">{item.stock || 0}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Stock Bajo — 0 < stock < mínimo, no archivado */}
              <TabsContent value="bajo-stock" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Productos con stock por debajo del mínimo requerido que necesitan reposición
                </p>
                {lowStockItems.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <AlertTriangle className="h-12 w-12 mx-auto text-success mb-4" />
                      <p className="text-muted-foreground">¡Excelente! No hay productos con stock bajo</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {lowStockItems.map((item) => {
                      const status = getStockStatus(item.stock || 0, item.minimum_stock || 0)
                      return (
                        <Card key={item.id} className="border-orange-200">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <AlertTriangle className="h-5 w-5 text-warning" />
                                  <h3 className="text-lg font-semibold">{item.name}</h3>
                                  <Badge variant="outline">{item.code}</Badge>
                                  <Badge variant="secondary">{item.category}</Badge>
                                  <Badge variant={status.variant}>{status.label}</Badge>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                                  <div>
                                    <span className="font-medium">Lote:</span> <span className={`font-semibold ${item.lote ? 'text-primary' : 'text-muted-foreground'}`}>{item.lote || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium">Stock Actual:</span> <span className="text-warning font-semibold">{formatNumber(item.stock || 0)}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium">Stock Mínimo:</span> {formatNumber(item.minimum_stock || 0)}
                                  </div>
                                  <div>
                                    <span className="font-medium">Faltante:</span> <span className="text-destructive font-semibold">{formatNumber(Math.max(0, (item.minimum_stock || 0) - (item.stock || 0)))}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {permissions.canEditInventory && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(item)}
                                    className="mr-2"
                                  >
                                    Editar
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openMovementHistory(item)}
                                >
                                  📊 Historial
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Sin Stock — stock === 0 o archivado */}
              <TabsContent value="sin-stock" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Productos agotados o archivados
                </p>
                {outOfStockItems.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Package className="h-12 w-12 mx-auto text-success mb-4" />
                      <p className="text-muted-foreground">¡Todos los productos tienen stock!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {outOfStockItems.map((item) => (
                      <Card key={item.id} className="border-border opacity-75">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <PackageX className="h-5 w-5 text-muted-foreground" />
                                <h3 className="text-lg font-semibold text-muted-foreground">{item.name}</h3>
                                <Badge variant="outline">{item.code}</Badge>
                                <Badge variant="secondary">{item.category}</Badge>
                                <Badge variant="destructive">Agotado</Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">Lote:</span> <span className={`font-semibold ${item.lote ? 'text-primary' : 'text-muted-foreground'}`}>{item.lote || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="font-medium">Stock Mínimo:</span> {formatNumber(item.minimum_stock || 0)}
                                </div>
                                {permissions.isAdmin && (
                                  <div>
                                    <span className="font-medium">Precio Unitario:</span> {formatCurrency(item.unit_price || 0)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {permissions.canEditInventory && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(item)}
                                  className="mr-2"
                                >
                                  Editar
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openMovementHistory(item)}
                              >
                                📊 Historial
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Edit Product Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Producto</DialogTitle>
                <DialogDescription>Actualizar información del producto</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit_name">Nombre del Producto</Label>
                  <Input
                    id="edit_name"
                    value={editProduct.name}
                    onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                    placeholder="Ej: VAC Granufoam Medium"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_code">Código</Label>
                  <Input
                    id="edit_code"
                    value={editProduct.code}
                    onChange={(e) => setEditProduct({ ...editProduct, code: e.target.value.toUpperCase() })}
                    placeholder="Ej: VGF-M"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_lote">Lote</Label>
                  <Input
                    id="edit_lote"
                    value={editProduct.lote}
                    onChange={(e) => setEditProduct({ ...editProduct, lote: e.target.value })}
                    placeholder="Ej: LOT2024001"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_category">Categoría</Label>
                  <Select
                    value={editProduct.category}
                    onValueChange={(value) => setEditProduct({ ...editProduct, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Apósitos">Apósitos</SelectItem>
                      <SelectItem value="Accesorios">Accesorios</SelectItem>
                      <SelectItem value="Canisters">Canisters</SelectItem>
                      <SelectItem value="Tubos">Tubos</SelectItem>
                      <SelectItem value="Otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_stock">Stock Actual</Label>
                    <Input
                      id="edit_stock"
                      type="number"
                      value={editProduct.stock}
                      onChange={(e) =>
                        setEditProduct({ ...editProduct, stock: Number.parseInt(e.target.value) || 0 })
                      }
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_minimum_stock">Stock Mínimo</Label>
                    <Input
                      id="edit_minimum_stock"
                      type="number"
                      value={editProduct.minimum_stock}
                      onChange={(e) =>
                        setEditProduct({ ...editProduct, minimum_stock: Number.parseInt(e.target.value) || 0 })
                      }
                      min="0"
                    />
                  </div>
                </div>
                {/* Solo mostrar precio unitario para administradores */}
                {permissions.isAdmin && (
                  <div>
                    <Label htmlFor="edit_unit_price">Precio Unitario (COP)</Label>
                    <Input
                      id="edit_unit_price"
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={editUnitPriceDisplay}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\./g, "")
                        if (raw === "" || /^\d+$/.test(raw)) {
                          const num = Number(raw) || 0
                          setEditUnitPriceDisplay(raw === "" ? "" : formatNumber(num))
                          setEditProduct({ ...editProduct, unit_price: num })
                        }
                      }}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateProduct}
                  disabled={isUpdating || !editProduct.name || !editProduct.code}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    "Actualizar Producto"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 🔧 NUEVO: Historial de Movimientos Dialog */}
          <Dialog open={isMovementHistoryOpen} onOpenChange={setIsMovementHistoryOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Historial de Movimientos - {selectedProductForHistory?.name}
                </DialogTitle>
                <DialogDescription>
                  Registro completo de entradas y salidas del producto {selectedProductForHistory?.code}
                </DialogDescription>
              </DialogHeader>
              
              {loadingHistory ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : movementHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No hay movimientos registrados para este producto</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Resumen */}
                  <Card className="bg-info-muted">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-success">
                            +{formatNumber(movementHistory.filter(m => m.movement_type === 'in').reduce((sum, m) => sum + m.quantity, 0))}
                          </div>
                          <p className="text-sm text-muted-foreground">Total Entradas</p>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-destructive">
                            -{formatNumber(movementHistory.filter(m => m.movement_type === 'out').reduce((sum, m) => sum + Math.abs(m.quantity), 0))}
                          </div>
                          <p className="text-sm text-muted-foreground">Total Salidas</p>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-primary">
                            {formatNumber(selectedProductForHistory?.stock || 0)}
                          </div>
                          <p className="text-sm text-muted-foreground">Stock Actual</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lista de movimientos */}
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {movementHistory.map((movement, index) => (
                      <Card key={movement.id} className={`border-l-4 ${
                        movement.movement_type === 'in' ? 'border-l-green-500' : 'border-l-red-500'
                      }`}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge variant={movement.movement_type === 'in' ? 'default' : 'destructive'}>
                                  {movement.movement_type === 'in' ? '📈 ENTRADA' : '📉 SALIDA'}
                                </Badge>
                                <Badge variant="outline">
                                  {movement.movement_type === 'in' ? '+' : ''}{formatNumber(Math.abs(movement.quantity))}
                                </Badge>
                                <Badge variant="secondary">
                                  {movement.reference_type === 'procedure' ? '🏥 Procedimiento' :
                                   movement.reference_type === 'manual_adjustment' ? '✋ Ajuste Manual' :
                                   movement.reference_type === 'manual_edit' ? '✏️ Edición' :
                                   movement.reference_type === 'stock_entry' ? '📦 Entrada Inventario' :
                                   movement.reference_type === 'initial_stock' ? '🏁 Inventario Inicial' :
                                   movement.reference_type}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                <strong>Detalle:</strong> {movement.notes || 'Sin detalles'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatTimestampForColombia(movement.created_at)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsMovementHistoryOpen(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  )
}
