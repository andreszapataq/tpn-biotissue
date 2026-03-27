"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, ArrowRightLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Tables } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth/auth-provider"
import { getCurrentDateInColombia, getMachineDisplayName } from "@/lib/utils"

type Machine = Tables<"machines">

interface TransferDialogProps {
  machine: Machine | null
  currentInstitutionId: string
  currentInstitutionName: string
  availableInstitutions: { id: string; name: string; code: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransferComplete: () => void
}

export function TransferDialog({
  machine,
  currentInstitutionId,
  currentInstitutionName,
  availableInstitutions,
  open,
  onOpenChange,
  onTransferComplete,
}: TransferDialogProps) {
  const [targetInstitutionId, setTargetInstitutionId] = useState("")
  const [transferDate, setTransferDate] = useState(getCurrentDateInColombia())
  const [remision, setRemision] = useState("")
  const [notes, setNotes] = useState("")
  const [isTransferring, setIsTransferring] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const targetInstitutions = availableInstitutions.filter(
    (inst) => inst.id !== currentInstitutionId
  )

  const handleTransfer = async () => {
    if (!machine || !targetInstitutionId) return

    try {
      setIsTransferring(true)

      const targetInst = targetInstitutions.find(
        (inst) => inst.id === targetInstitutionId
      )

      // 1. Insert transfer record
      const { error: transferError } = await supabase
        .from("machine_transfers")
        .insert({
          machine_id: machine.id,
          from_institution_id: currentInstitutionId,
          to_institution_id: targetInstitutionId,
          transfer_date: transferDate,
          transferred_by: user?.profile_id || null,
          remision: remision.trim().toUpperCase() || null,
          notes: notes.trim() || null,
        } as any)

      if (transferError) throw transferError

      // 2. Update machine's institution_id and reset status to active
      const { error: updateError } = await supabase
        .from("machines")
        .update({
          institution_id: targetInstitutionId,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", machine.id)

      if (updateError) throw updateError

      toast({
        title: "Transferencia Exitosa",
        description: `${getMachineDisplayName(machine.model, machine.lote)} transferida a ${targetInst?.name}`,
      })

      // Reset and close
      setTargetInstitutionId("")
      setRemision("")
      setNotes("")
      setTransferDate(getCurrentDateInColombia())
      onOpenChange(false)
      onTransferComplete()
    } catch (error: any) {
      console.error("Error transferring machine:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo completar la transferencia",
        variant: "destructive",
      })
    } finally {
      setIsTransferring(false)
    }
  }

  if (!machine) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transferir Máquina
          </DialogTitle>
          <DialogDescription>
            Transferir esta máquina a otra institución
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Machine info */}
          <div className="rounded-md border p-3 bg-muted/50">
            <p className="font-medium">
              {getMachineDisplayName(machine.model, machine.lote)}
            </p>
            <p className="text-sm text-muted-foreground">
              Lote: {machine.lote} | Ref: {machine.reference_code}
            </p>
          </div>

          {/* Origin (read-only) */}
          <div>
            <Label>Origen</Label>
            <Input value={currentInstitutionName} disabled />
          </div>

          {/* Target institution */}
          <div>
            <Label htmlFor="target_institution">Institución Destino</Label>
            {targetInstitutions.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-1">
                No hay otras instituciones disponibles. Contacta al
                administrador para obtener acceso a más instituciones.
              </p>
            ) : (
              <Select
                value={targetInstitutionId}
                onValueChange={setTargetInstitutionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar institución destino" />
                </SelectTrigger>
                <SelectContent>
                  {targetInstitutions.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Transfer date */}
          <div>
            <Label htmlFor="transfer_date">Fecha de Transferencia</Label>
            <Input
              id="transfer_date"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
          </div>

          {/* Remision */}
          <div>
            <Label htmlFor="transfer_remision">Número de Remisión</Label>
            <Input
              id="transfer_remision"
              value={remision}
              onChange={(e) => setRemision(e.target.value.toUpperCase())}
              placeholder="Ej: REM-2026-001"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="transfer_notes">Notas (opcional)</Label>
            <Textarea
              id="transfer_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo de la transferencia, observaciones..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={
              isTransferring ||
              !targetInstitutionId ||
              targetInstitutions.length === 0
            }
          >
            {isTransferring ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transfiriendo...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Confirmar Transferencia
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
