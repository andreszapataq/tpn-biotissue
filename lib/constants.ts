// Modelos de maquinas NPWT disponibles con codigos de referencia
export interface MachineModel {
  code: string
  name: string
  shortName: string
  subtitle?: string
  image: string
}

export const MACHINE_MODELS: MachineModel[] = [
  {
    code: "12236",
    name: "TopiVac Hand T-NPWT Classic",
    shortName: "Classic",
    image: "/images/machines/classic.png",
  },
  {
    code: "12229",
    name: "TopiVac Hand T-NPWT Irrigation (C)",
    shortName: "Irrigation (C)",
    subtitle: "Cassette",
    image: "/images/machines/irrigation-c.png",
  },
  {
    code: "12229",
    name: "TopiVac Hand T-NPWT Irrigation (P)",
    shortName: "Irrigation (P)",
    subtitle: "Peristáltica",
    image: "/images/machines/irrigation-p.png",
  },
  {
    code: "12212",
    name: "TopiVac Medium Clinic V4",
    shortName: "Medium Clinic V4",
    image: "/images/machines/medium-clinic.png",
  },
  {
    code: "13066",
    name: "TopiVac Handy Careoxi NPWT",
    shortName: "CareOxi",
    image: "/images/machines/careoxi.png",
  },
]

export function getModelConfig(modelName: string): MachineModel | undefined {
  return MACHINE_MODELS.find((m) => m.name === modelName)
}
