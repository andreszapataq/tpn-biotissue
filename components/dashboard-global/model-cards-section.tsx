"use client"

import { MACHINE_MODELS } from "@/lib/constants"
import { ModelCard } from "./model-card"

interface ModelStats {
  model: string
  total_count: number
  in_use_count: number
  available_count: number
  maintenance_count: number
}

interface ModelCardsSectionProps {
  modelStats: ModelStats[]
}

export function ModelCardsSection({ modelStats }: ModelCardsSectionProps) {
  const getStatsForModel = (modelName: string): ModelStats => {
    return (
      modelStats.find((s) => s.model === modelName) ?? {
        model: modelName,
        total_count: 0,
        in_use_count: 0,
        available_count: 0,
        maintenance_count: 0,
      }
    )
  }

  return (
    <section>
      <h2 className="heading-2 mb-4">Equipos por Modelo</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {MACHINE_MODELS.map((model, index) => {
          const stats = getStatsForModel(model.name)
          return (
            <ModelCard
              key={model.name}
              model={model}
              totalCount={stats.total_count}
              inUseCount={stats.in_use_count}
              availableCount={stats.available_count}
              maintenanceCount={stats.maintenance_count}
              index={index}
            />
          )
        })}
      </div>
    </section>
  )
}
