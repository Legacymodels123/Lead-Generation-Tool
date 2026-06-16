import type { IcpConfig } from "./types";

export const LEGACY_SCALE_MODELS_ICP: IcpConfig = {
  id: "legacy-scale-models",
  name: "Legacy Scale Models",
  companyDescription:
    "Legacy Scale Models (formerly Holland Oto) produces premium custom scale models of tractors, buses, trucks and mobility vehicles for showrooms, trade shows, corporate gifts and co-branded merchandise. Minimum orders from ~100 units.",
  markets: [
    {
      id: "agri",
      label: "Agri Machinery",
      keywords: ["agri", "farm", "tractor", "landmaschinen", "landbouw", "machinery", "dealer"],
      sectorTags: ["Agri Machinery", "Agri Dealer", "Agri Manufacturer", "Agri Importer", "Agri Trading"],
      scoreBonus: 15,
    },
    {
      id: "bus_coach",
      label: "Bus / Coach",
      keywords: ["bus", "coach", "touringcar", "reizen", "transport", "mercedes tourismo"],
      sectorTags: ["Bus Operator", "Coach Operator", "Public Transport"],
      scoreBonus: 14,
    },
    {
      id: "truck_fleet",
      label: "Truck / Fleet",
      keywords: ["truck", "vrachtwagen", "fleet", "logistics", "transport", "haulage"],
      sectorTags: ["Truck Operator", "Fleet", "Logistics", "Transport"],
      scoreBonus: 14,
    },
    {
      id: "oem",
      label: "OEM / Brand Marketing",
      keywords: ["oem", "brand", "automotive", "vehicle manufacturer"],
      sectorTags: ["OEM", "Automotive", "Vehicle Manufacturer"],
      scoreBonus: 12,
    },
  ],
  dmuRoles: ["marketing_brand", "ceo_owner"],
  minEmployees: 50,
  preferredCountries: ["Nederland", "Duitsland", "België", "Noorwegen", "Oostenrijk"],
  countryScoreBonus: {
    Nederland: 5,
    Duitsland: 4,
    België: 4,
    Noorwegen: 3,
  },
  useCases: [
    "Showroom displays",
    "Trade shows and events",
    "Corporate and partner gifts",
    "Co-branded miniatures",
  ],
  minOrderUnits: 100,
};
