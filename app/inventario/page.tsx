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

type InventoryProduct = Tables<"inventory_products">

export default function Inventario() {
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

      // Preparar datos con validación de tipos
      const productData = {
        name: newProduct.name.trim(),
        code: newProduct.code.trim().toUpperCase(),
        category: newProduct.category,
        stock: Number(newProduct.stock) || 0,
        minimum_stock: Number(newProduct.minimum_stock) || 5,
        unit_price: Number(newProduct.unit_price) || 0,
        lote: newProduct.lote.trim() || null,
      }

      console.log("Inserting product:", productData)

      const { data, error } = await supabase
        .from("inventory_products")
        .insert([productData])
        .select()
        .single()

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      toast({
        title: "Éxito",
        description: "Producto creado correctamente",
      })

      setInventory([...inventory, data])
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

      // Preparar datos con validación de tipos
      const productData = {
        name: editProduct.name.trim(),
        code: editProduct.code.trim().toUpperCase(),
        category: editProduct.category,
        stock: Number(editProduct.stock) || 0,
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

      toast({
        title: "Éxito",
        description: "Producto actualizado correctamente",
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

  // Actualizar stock
  const handleStockAdjustment = async (productId: string, adjustment: number) => {
    try {
      const product = inventory.find((p) => p.id === productId)
      if (!product) return

      const newStock = Math.max(0, (product.stock || 0) + adjustment)

      const { error } = await supabase
        .from("inventory_products")
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq("id", productId)

      if (error) throw error

      setInventory(inventory.map((item) => (item.id === productId ? { ...item, stock: newStock } : item)))

      toast({
        title: "Stock actualizado",
        description: `${product.name}: ${newStock} unidades`,
      })
    } catch (error: any) {
      console.error("Error updating stock:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el stock",
        variant: "destructive",
      })
    }
  }

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
                  <div className="text-2xl font-bold">{totalProducts}</div>
                  <p className="text-xs text-muted-foreground">Tipos de productos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">{lowStockCount}</div>
                  <p className="text-xs text-muted-foreground">Requieren reposición</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Valor del inventario</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Acciones</CardTitle>
                  <Plus className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
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
                        <div>
                          <Label htmlFor="unit_price">Precio Unitario ($)</Label>
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
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
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
                <TabsTrigger value="todos">Todos los Productos ({filteredInventory.length})</TabsTrigger>
                <TabsTrigger value="bajo-stock">Stock Bajo ({lowStockItems.length})</TabsTrigger>
                <TabsTrigger value="normal">Stock Normal ({normalStockItems.length})</TabsTrigger>
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
                                  <Badge variant={status.variant}>{status.label}</Badge>
                                  <Badge variant="secondary">{item.category}</Badge>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">Lote:</span> {item.lote || "N/A"}
                                  </div>
                                  <div>
                                    <span className="font-medium">Stock Actual:</span> {item.stock || 0}
                                  </div>
                                  <div>
                                    <span className="font-medium">Stock Mínimo:</span> {item.minimum_stock || 0}
                                  </div>
                                  <div>
                                    <span className="font-medium">Precio Unitario:</span> ${item.unit_price || 0}
                                  </div>
                                  <div>
                                    <span className="font-medium">Valor Total:</span> $
                                    {((item.stock || 0) * (item.unit_price || 0)).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(item)}
                                  className="mr-2"
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStockAdjustment(item.id, -1)}
                                  disabled={(item.stock || 0) === 0}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-12 text-center font-medium">{item.stock || 0}</span>
                                <Button variant="outline" size="sm" onClick={() => handleStockAdjustment(item.id, 1)}>
                                  <Plus className="h-3 w-3" />
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
                                  <Badge variant={status.variant}>{status.label}</Badge>
                                </div>
                                <p className="text-sm text-gray-600">
                                  Stock: {item.stock} • Mínimo: {item.minimum_stock} • Precio: ${item.unit_price}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleStockAdjustment(item.id, -1)}>
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-12 text-center font-medium">{item.stock}</span>
                                <Button variant="outline" size="sm" onClick={() => handleStockAdjustment(item.id, 1)}>
                                  <Plus className="h-3 w-3" />
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
                <div>
                  <Label htmlFor="edit_unit_price">Precio Unitario ($)</Label>
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
        </div>
      </div>
    </ProtectedRoute>
  )
}
