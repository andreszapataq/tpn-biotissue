"use client"

import { useState, useEffect } from "react"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search, Package, AlertTriangle, Plus, Minus, TrendingUp, Loader2 } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Tables } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { usePermissions } from "@/hooks/use-permissions"
import { useAuth } from "@/components/auth/auth-provider"

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
    lote: "",
  })

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

  // Estados para entrada de inventario
  const [isStockEntryDialogOpen, setIsStockEntryDialogOpen] = useState(false)
  const [isProcessingEntry, setIsProcessingEntry] = useState(false)
  const [stockEntries, setStockEntries] = useState<{[key: string]: {quantity: number, reason: string}}>({})

  // Estados para historial de movimientos
  const [isMovementHistoryOpen, setIsMovementHistoryOpen] = useState(false)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<InventoryProduct | null>(null)
  const [movementHistory, setMovementHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Cargar productos desde la base de datos
  const loadInventory = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("inventory_products").select("*").order("name", { ascending: true })

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
    loadInventory()
  }, [])

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

      // Verificar que el código no existe
      const { data: existingProduct } = await supabase
        .from("inventory_products")
        .select("id")
        .eq("code", newProduct.code.toUpperCase())
        .single()

      if (existingProduct) {
        throw new Error("Ya existe un producto con este código")
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
        stock: newProduct.stock,
        minimum_stock: newProduct.minimum_stock,
        unit_price: newProduct.unit_price,
        lote: newProduct.lote.trim() || null,
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
        lote: "",
      })
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

  const lowStockItems = filteredInventory.filter((item) => (item.stock || 0) <= (item.minimum_stock || 0))
  const normalStockItems = filteredInventory.filter((item) => (item.stock || 0) > (item.minimum_stock || 0))

  const getStockStatus = (stock: number, minimum: number) => {
    if (stock === 0) return { variant: "destructive" as const, label: "Agotado" }
    if (stock <= minimum) return { variant: "destructive" as const, label: "Stock Bajo" }
    if (stock <= minimum * 1.5) return { variant: "secondary" as const, label: "Stock Medio" }
    return { variant: "default" as const, label: "Stock Normal" }
  }

  const totalProducts = inventory.length
  const lowStockCount = lowStockItems.length
  const totalValue = inventory.reduce((sum, item) => sum + (item.stock || 0) * (item.unit_price || 0), 0)

  // 🔧 NUEVO: Función para entrada masiva de inventario
  const handleBulkStockEntry = async () => {
    try {
      setIsProcessingEntry(true)

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

      const updates = []
      const movements = []

      for (const [productId, entry] of Object.entries(stockEntries)) {
        if (entry.quantity <= 0) continue

        const product = inventory.find(p => p.id === productId)
        if (!product) continue

        const oldStock = product.stock || 0
        const newStock = oldStock + entry.quantity

        // Actualización de stock
        updates.push(
          supabase
            .from("inventory_products")
            .update({ 
              stock: newStock, 
              updated_at: new Date().toISOString() 
            })
            .eq("id", productId)
        )

        // Movimiento de inventario
        const movementData: any = {
          product_id: productId,
          movement_type: "in",
          quantity: entry.quantity,
          reference_type: "stock_entry",
          reference_id: null,
          notes: entry.reason || `Entrada de inventario: +${entry.quantity} unidades`
        }

        if (userProfile?.id) {
          movementData.created_by = userProfile.id
        }

        movements.push(movementData)
      }

      // Ejecutar todas las actualizaciones
      for (const update of updates) {
        const { error } = await update
        if (error) throw error
      }

      // Registrar todos los movimientos
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

      // Actualizar inventario local
      const updatedInventory = inventory.map(item => {
        const entry = stockEntries[item.id]
        if (entry && entry.quantity > 0) {
          return { ...item, stock: (item.stock || 0) + entry.quantity }
        }
        return item
      })

      setInventory(updatedInventory)
      setStockEntries({})
      setIsStockEntryDialogOpen(false)

      toast({
        title: "Éxito",
        description: `Entrada de inventario procesada. ${Object.keys(stockEntries).length} productos actualizados.`,
      })

    } catch (error: any) {
      console.error("Error processing stock entry:", error)
      toast({
        title: "Error",
        description: "No se pudo procesar la entrada de inventario",
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
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Inventario</h1>
                <p className="text-gray-600">Control de stock de productos NPWT</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(totalProducts)}</div>
                  <p className="text-xs text-muted-foreground">Tipos de productos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">{formatNumber(lowStockCount)}</div>
                  <p className="text-xs text-muted-foreground">Requieren reposición</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {permissions.isAdmin ? "Valor Total" : "Productos Activos"}
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {permissions.isAdmin 
                      ? formatCurrency(totalValue)
                      : formatNumber(inventory.filter(i => (i.stock || 0) > 0).length)
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {permissions.isAdmin ? "Valor del inventario" : "Con stock disponible"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Acciones</CardTitle>
                  <Plus className="h-4 w-4 text-blue-500" />
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
                          <Label htmlFor="name">Nombre del Producto</Label>
                          <Input
                            id="name"
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                            placeholder="Ej: Multidress"
                          />
                        </div>
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
                          <Label htmlFor="lote">Lote</Label>
                          <Input
                            id="lote"
                            value={newProduct.lote}
                            onChange={(e) => setNewProduct({ ...newProduct, lote: e.target.value })}
                            placeholder="Ej: 2024001"
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
                        {/* 🔒 Solo mostrar precio unitario para administradores */}
                        {permissions.isAdmin && (
                          <div>
                            <Label htmlFor="unit_price">Precio Unitario (COP)</Label>
                            <Input
                              id="unit_price"
                              type="number"
                              step="0.01"
                              value={newProduct.unit_price}
                              onChange={(e) =>
                                setNewProduct({ ...newProduct, unit_price: Number.parseFloat(e.target.value) || 0 })
                              }
                              min="0"
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
                      <p className="text-sm text-gray-500">Solo administradores</p>
                      <p className="text-xs text-gray-400">pueden crear productos</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* 🔧 NUEVO: Botón Entrada de Inventario */}
              {permissions.canAdjustStock && (
                <Dialog open={isStockEntryDialogOpen} onOpenChange={setIsStockEntryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="whitespace-nowrap">
                      <Package className="h-4 w-4 mr-2" />
                      Entrada de Inventario
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Entrada de Inventario</DialogTitle>
                      <DialogDescription>
                        Registrar nuevas existencias que llegan a la bodega
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid gap-4 max-h-96 overflow-y-auto">
                        {inventory.map((product) => (
                          <Card key={product.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{product.name}</span>
                                  <Badge variant="outline">{product.code}</Badge>
                                  <Badge variant="secondary">Stock actual: {formatNumber(product.stock || 0)}</Badge>
                                </div>
                                <p className="text-sm text-gray-600">
                                  Categoría: {product.category} • Lote: {product.lote || "N/A"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  placeholder="Cantidad"
                                  min="0"
                                  className="w-20"
                                  value={stockEntries[product.id]?.quantity || ""}
                                  onChange={(e) => {
                                    const quantity = parseInt(e.target.value) || 0
                                    setStockEntries(prev => ({
                                      ...prev,
                                      [product.id]: {
                                        ...prev[product.id],
                                        quantity,
                                        reason: prev[product.id]?.reason || ""
                                      }
                                    }))
                                  }}
                                />
                                <Input
                                  placeholder="Motivo (opcional)"
                                  className="w-48"
                                  value={stockEntries[product.id]?.reason || ""}
                                  onChange={(e) => {
                                    setStockEntries(prev => ({
                                      ...prev,
                                      [product.id]: {
                                        ...prev[product.id],
                                        quantity: prev[product.id]?.quantity || 0,
                                        reason: e.target.value
                                      }
                                    }))
                                  }}
                                />
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setIsStockEntryDialogOpen(false)
                        setStockEntries({})
                      }}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleBulkStockEntry}
                        disabled={isProcessingEntry || Object.values(stockEntries).every(entry => entry.quantity <= 0)}
                      >
                        {isProcessingEntry ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          "Procesar Entrada"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Inventory Tabs */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <Tabs defaultValue="todos" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="todos">Todos los Productos ({formatNumber(filteredInventory.length)})</TabsTrigger>
                <TabsTrigger value="bajo-stock">Stock Bajo ({formatNumber(lowStockItems.length)})</TabsTrigger>
                <TabsTrigger value="normal">Stock Normal ({formatNumber(normalStockItems.length)})</TabsTrigger>
              </TabsList>

              <TabsContent value="todos" className="space-y-4">
                {filteredInventory.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No hay productos en el inventario</p>
                      <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Primer Producto
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {filteredInventory.map((item) => {
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
                                  {/* Solo mostrar badge de estado para administradores */}
                                  {permissions.isAdmin && <Badge variant={status.variant}>{status.label}</Badge>}
                                </div>
                                <div className={`grid gap-4 text-sm text-gray-600 ${permissions.isAdmin ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
                                  <div>
                                    <span className="font-medium">Lote:</span> {item.lote || "N/A"}
                                  </div>
                                  <div>
                                    <span className="font-medium">Stock Actual:</span> {formatNumber(item.stock || 0)}
                                  </div>
                                  <div>
                                    <span className="font-medium">Stock Mínimo:</span> {formatNumber(item.minimum_stock || 0)}
                                  </div>
                                  {/* 🔒 Solo mostrar precios para administradores */}
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
                                {/* 🔧 NUEVO: Botón de Historial */}
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

              <TabsContent value="bajo-stock" className="space-y-4">
                {lowStockItems.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <AlertTriangle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                      <p className="text-gray-500">¡Excelente! No hay productos con stock bajo</p>
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
                                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                                  <h3 className="text-lg font-semibold">{item.name}</h3>
                                  <Badge variant="outline">{item.code}</Badge>
                                  <Badge variant="secondary">{item.category}</Badge>
                                  <Badge variant={status.variant}>{status.label}</Badge>
                                </div>
                                <p className="text-sm text-gray-600">
                                  Stock actual: {item.stock || 0} • Mínimo requerido: {item.minimum_stock || 0} • Faltante:{" "}
                                  {Math.max(0, (item.minimum_stock || 0) - (item.stock || 0))}
                                </p>
                              </div>
                              <Button variant="default">Solicitar Reposición</Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="normal" className="space-y-4">
                {normalStockItems.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No hay productos con stock normal</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {normalStockItems.map((item) => {
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
                                  <Badge variant={status.variant}>{status.label}</Badge>
                                </div>
                                <p className="text-sm text-gray-600">
                                  Stock: {item.stock} • Mínimo: {item.minimum_stock} • Precio: ${item.unit_price}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
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
                {/* 🔒 Solo mostrar precio unitario para administradores */}
                {permissions.isAdmin && (
                  <div>
                    <Label htmlFor="edit_unit_price">Precio Unitario (COP)</Label>
                    <Input
                      id="edit_unit_price"
                      type="number"
                      step="0.01"
                      value={editProduct.unit_price}
                      onChange={(e) =>
                        setEditProduct({ ...editProduct, unit_price: Number.parseFloat(e.target.value) || 0 })
                      }
                      min="0"
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
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : movementHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No hay movimientos registrados para este producto</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Resumen */}
                  <Card className="bg-blue-50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            +{formatNumber(movementHistory.filter(m => m.movement_type === 'in').reduce((sum, m) => sum + m.quantity, 0))}
                          </div>
                          <p className="text-sm text-gray-600">Total Entradas</p>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-600">
                            -{formatNumber(movementHistory.filter(m => m.movement_type === 'out').reduce((sum, m) => sum + Math.abs(m.quantity), 0))}
                          </div>
                          <p className="text-sm text-gray-600">Total Salidas</p>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-600">
                            {formatNumber(selectedProductForHistory?.stock || 0)}
                          </div>
                          <p className="text-sm text-gray-600">Stock Actual</p>
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
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>Detalle:</strong> {movement.notes || 'Sin detalles'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(movement.created_at).toLocaleString('es-ES', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
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
