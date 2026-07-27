import type { MaterialCategory, MaterialFinish, PhysicalMaterialJSON } from './PhysicalMaterial'
import { MATERIAL_CATEGORIES, PhysicalMaterial, slugify } from './PhysicalMaterial'

/**
 * The built-in materials library — a hundred and forty standard engineering
 * materials with the properties a CAD document actually asks for.
 *
 * The numbers are typical room-temperature handbook values of the kind MatWeb,
 * the ASM Metals Handbook and CES Selector publish. They are representative of
 * the alloy or grade, not a certificate for a particular heat, which is exactly
 * what a mass or a stiffness estimate at design time needs. A property nobody
 * publishes for a material — the yield strength of a ceramic, the modulus of
 * water — is `null` rather than a made-up zero.
 *
 * Columns are, in order: name, subcategory, density (g/cm³), Young's modulus
 * (GPa), Poisson's ratio, yield strength (MPa), ultimate tensile strength
 * (MPa), thermal conductivity (W/m·K), thermal expansion (1/K), specific heat
 * (J/kg·K), and the swatch colour.
 */

type MaterialRow = readonly [
  name: string,
  subcategory: string,
  density: number,
  youngsModulus: number | null,
  poissonsRatio: number | null,
  yieldStrength: number | null,
  ultimateTensileStrength: number | null,
  thermalConductivity: number | null,
  thermalExpansion: number | null,
  specificHeat: number | null,
  color: string,
]

const STEEL = '#8f9499'
const STAINLESS = '#b9bec3'
const TOOL_STEEL = '#71767c'
const IRON = '#6e7276'
const ALUMINUM = '#cfd3d7'
const TITANIUM = '#a9aab0'
const COPPER = '#b87333'
const BRASS = '#c9a227'
const BRONZE = '#8c6239'
const NICKEL = '#a7a9ac'
const LIGHT_METAL = '#d0d2d4'
const PLASTIC = '#d8d4c8'
const WOOD = '#b08a56'
const GLASS = '#dff0f5'
const CERAMIC = '#e4e0d6'
const RUBBER = '#26282b'
const COMPOSITE = '#1f2226'
const FLUID = '#7fb4c8'
const NEUTRAL = '#9aa0a6'

const TABLE: readonly (readonly [MaterialCategory, readonly MaterialRow[]])[] = [
  [
    'metal',
    [
      // ------------------------------------------------ carbon & alloy steel
      ['AISI 1018 Steel', 'carbon-steel', 7.87, 205, 0.29, 370, 440, 51.9, 11.5e-6, 486, STEEL],
      ['AISI 1020 Steel', 'carbon-steel', 7.87, 200, 0.29, 350, 420, 51.9, 11.7e-6, 486, STEEL],
      ['AISI 1045 Steel', 'carbon-steel', 7.87, 200, 0.29, 530, 625, 49.8, 11.5e-6, 486, STEEL],
      ['AISI 1095 Steel', 'carbon-steel', 7.85, 205, 0.29, 525, 685, 46.6, 11.4e-6, 477, STEEL],
      ['AISI 12L14 Steel', 'carbon-steel', 7.87, 200, 0.29, 415, 540, 51.9, 11.5e-6, 486, STEEL],
      ['ASTM A36 Steel', 'carbon-steel', 7.85, 200, 0.26, 250, 400, 51.9, 11.7e-6, 486, STEEL],
      ['AISI 4130 Steel', 'alloy-steel', 7.85, 205, 0.29, 460, 560, 42.7, 12.2e-6, 477, STEEL],
      ['AISI 4140 Steel', 'alloy-steel', 7.85, 205, 0.29, 655, 1020, 42.6, 12.3e-6, 473, STEEL],
      ['AISI 4340 Steel', 'alloy-steel', 7.85, 205, 0.29, 470, 745, 44.5, 12.3e-6, 475, STEEL],
      ['AISI 8620 Steel', 'alloy-steel', 7.85, 205, 0.29, 385, 530, 46.6, 11.5e-6, 475, STEEL],

      // ----------------------------------------------------------- stainless
      ['AISI 303 Stainless', 'stainless-steel', 8.0, 193, 0.29, 240, 620, 16.2, 17.3e-6, 500, STAINLESS],
      ['AISI 304 Stainless', 'stainless-steel', 8.0, 193, 0.29, 215, 505, 16.2, 17.3e-6, 500, STAINLESS],
      ['AISI 316 Stainless', 'stainless-steel', 8.0, 193, 0.27, 205, 515, 16.3, 15.9e-6, 500, STAINLESS],
      ['AISI 410 Stainless', 'stainless-steel', 7.75, 200, 0.28, 275, 485, 24.9, 9.9e-6, 460, STAINLESS],
      ['AISI 416 Stainless', 'stainless-steel', 7.75, 200, 0.28, 275, 517, 24.9, 9.9e-6, 460, STAINLESS],
      ['AISI 420 Stainless', 'stainless-steel', 7.75, 200, 0.28, 345, 655, 24.9, 10.3e-6, 460, STAINLESS],
      ['AISI 440C Stainless', 'stainless-steel', 7.65, 200, 0.28, 450, 760, 24.2, 10.1e-6, 460, STAINLESS],
      ['17-4 PH Stainless', 'stainless-steel', 7.75, 197, 0.27, 1170, 1310, 18.3, 10.8e-6, 460, STAINLESS],
      ['2205 Duplex Stainless', 'stainless-steel', 7.8, 200, 0.3, 450, 655, 19.0, 13.7e-6, 418, STAINLESS],

      // ---------------------------------------------------------- tool steel
      ['A2 Tool Steel', 'tool-steel', 7.86, 203, 0.29, 1620, 1900, 26.0, 10.6e-6, 460, TOOL_STEEL],
      ['D2 Tool Steel', 'tool-steel', 7.7, 210, 0.29, 1750, 2100, 20.0, 10.4e-6, 460, TOOL_STEEL],
      ['O1 Tool Steel', 'tool-steel', 7.81, 205, 0.29, 1450, 1800, 30.0, 11.2e-6, 460, TOOL_STEEL],
      ['S7 Tool Steel', 'tool-steel', 7.83, 205, 0.29, 1450, 1800, 27.0, 12.6e-6, 460, TOOL_STEEL],
      ['H13 Tool Steel', 'tool-steel', 7.8, 210, 0.3, 1300, 1600, 24.3, 11.5e-6, 460, TOOL_STEEL],
      ['M2 High Speed Steel', 'tool-steel', 8.14, 217, 0.3, 2100, 2400, 21.0, 11.0e-6, 420, TOOL_STEEL],

      // ----------------------------------------------------------- cast iron
      ['Gray Cast Iron G3000', 'cast-iron', 7.15, 110, 0.26, null, 207, 46.0, 10.5e-6, 490, IRON],
      ['Ductile Iron 65-45-12', 'cast-iron', 7.1, 169, 0.28, 310, 448, 33.0, 11.0e-6, 460, IRON],
      ['Malleable Iron 32510', 'cast-iron', 7.3, 170, 0.26, 224, 345, 45.0, 12.0e-6, 460, IRON],

      // ------------------------------------------------------------ aluminum
      ['Aluminium 1100-H14', 'aluminum', 2.71, 69, 0.33, 110, 124, 222, 23.6e-6, 904, ALUMINUM],
      ['Aluminium 2024-T3', 'aluminum', 2.78, 73.1, 0.33, 345, 483, 121, 23.2e-6, 875, ALUMINUM],
      ['Aluminium 3003-H14', 'aluminum', 2.73, 68.9, 0.33, 145, 150, 159, 23.2e-6, 893, ALUMINUM],
      ['Aluminium 5052-H32', 'aluminum', 2.68, 70.3, 0.33, 193, 228, 138, 23.8e-6, 880, ALUMINUM],
      ['Aluminium 6061-T6', 'aluminum', 2.7, 68.9, 0.33, 276, 310, 167, 23.6e-6, 896, ALUMINUM],
      ['Aluminium 6063-T5', 'aluminum', 2.7, 68.9, 0.33, 145, 186, 209, 23.4e-6, 900, ALUMINUM],
      ['Aluminium 7075-T6', 'aluminum', 2.81, 71.7, 0.33, 503, 572, 130, 23.6e-6, 960, ALUMINUM],
      ['Aluminium A356-T6', 'aluminum', 2.68, 72.4, 0.33, 205, 262, 151, 21.5e-6, 963, ALUMINUM],

      // ------------------------------------------------------------ titanium
      ['Titanium Grade 2 (CP)', 'titanium', 4.51, 105, 0.37, 275, 344, 16.4, 8.6e-6, 523, TITANIUM],
      ['Ti-6Al-4V (Grade 5)', 'titanium', 4.43, 113.8, 0.342, 880, 950, 6.7, 8.6e-6, 526, TITANIUM],
      ['Titanium Grade 9 (3Al-2.5V)', 'titanium', 4.48, 107, 0.33, 483, 620, 7.6, 9.0e-6, 544, TITANIUM],

      // -------------------------------------------------- copper alloys etc.
      ['Copper C11000 (ETP)', 'copper', 8.94, 115, 0.34, 69, 220, 388, 17.0e-6, 385, COPPER],
      ['Copper C10100 (OFHC)', 'copper', 8.94, 115, 0.34, 70, 221, 391, 17.0e-6, 385, COPPER],
      ['Beryllium Copper C17200', 'copper', 8.25, 128, 0.3, 1030, 1240, 105, 17.0e-6, 420, COPPER],
      ['Brass C36000 (free-cutting)', 'brass', 8.49, 97, 0.31, 310, 400, 115, 20.5e-6, 380, BRASS],
      ['Brass C26000 (cartridge)', 'brass', 8.53, 110, 0.35, 200, 400, 120, 19.9e-6, 375, BRASS],
      ['Naval Brass C46400', 'brass', 8.41, 100, 0.34, 170, 415, 116, 21.2e-6, 375, BRASS],
      ['Phosphor Bronze C51000', 'bronze', 8.86, 110, 0.34, 165, 400, 69, 17.8e-6, 380, BRONZE],
      ['Bearing Bronze C93200', 'bronze', 8.93, 100, 0.34, 125, 240, 59, 18.0e-6, 376, BRONZE],
      ['Aluminium Bronze C63000', 'bronze', 7.58, 110, 0.32, 345, 690, 39, 16.2e-6, 375, BRONZE],

      // -------------------------------------------------------------- nickel
      ['Nickel 200', 'nickel', 8.89, 204, 0.31, 148, 462, 70.2, 13.3e-6, 456, NICKEL],
      ['Monel 400', 'nickel', 8.8, 179, 0.32, 240, 550, 21.8, 13.9e-6, 427, NICKEL],
      ['Inconel 625', 'nickel', 8.44, 207.5, 0.278, 490, 930, 9.8, 12.8e-6, 410, NICKEL],
      ['Inconel 718', 'nickel', 8.19, 200, 0.294, 1100, 1375, 11.4, 13.0e-6, 435, NICKEL],

      // ------------------------------------------------ light and misc metal
      ['Magnesium AZ31B', 'magnesium', 1.77, 45, 0.35, 220, 290, 96, 26.0e-6, 1000, LIGHT_METAL],
      ['Magnesium AZ91D', 'magnesium', 1.81, 44.8, 0.35, 160, 230, 72.7, 26.0e-6, 1020, LIGHT_METAL],
      ['Zamak 3 Zinc Alloy', 'zinc', 6.6, 96, 0.3, 221, 268, 113, 27.4e-6, 419, LIGHT_METAL],
      ['Zamak 5 Zinc Alloy', 'zinc', 6.7, 96, 0.3, 269, 328, 109, 27.4e-6, 419, LIGHT_METAL],
      ['Lead (pure)', 'lead', 11.34, 13.5, 0.44, 12, 18, 35, 29.1e-6, 129, NEUTRAL],
      ['Tin (pure)', 'other', 7.31, 47, 0.36, 12, 22, 66.6, 22.0e-6, 228, NEUTRAL],
      ['Silver (pure)', 'precious', 10.49, 76, 0.37, 55, 172, 429, 18.9e-6, 235, '#d7d7d2'],
      ['Gold (pure)', 'precious', 19.32, 79, 0.44, 100, 130, 318, 14.2e-6, 129, '#d4af37'],
      ['Platinum (pure)', 'precious', 21.45, 168, 0.38, 165, 240, 71.6, 8.8e-6, 133, '#d1d3d6'],
      ['Tungsten (pure)', 'refractory', 19.25, 411, 0.28, 750, 980, 173, 4.5e-6, 132, '#7e8285'],
      ['Molybdenum (pure)', 'refractory', 10.22, 329, 0.31, 415, 550, 138, 4.8e-6, 251, '#8b8f93'],
    ],
  ],

  [
    'plastic',
    [
      ['ABS', 'abs', 1.04, 2.3, 0.35, 43, 45, 0.17, 90e-6, 1400, PLASTIC],
      ['ABS 20% Glass Filled', 'abs', 1.23, 5.5, 0.35, 75, 78, 0.22, 40e-6, 1300, PLASTIC],
      ['PLA', 'pla', 1.24, 3.5, 0.36, 55, 60, 0.13, 68e-6, 1800, '#e3e0d4'],
      ['PETG', 'other', 1.27, 2.1, 0.38, 50, 53, 0.2, 68e-6, 1200, '#dfe4e6'],
      ['PET', 'other', 1.38, 2.8, 0.4, 60, 75, 0.24, 70e-6, 1000, '#dfe4e6'],
      ['Nylon 6', 'nylon', 1.14, 2.9, 0.39, 45, 80, 0.25, 80e-6, 1670, '#e6e2d6'],
      ['Nylon 6/6', 'nylon', 1.14, 3.3, 0.39, 55, 82, 0.25, 80e-6, 1670, '#e6e2d6'],
      ['Nylon 6/6 30% Glass', 'nylon', 1.35, 9.0, 0.35, 100, 172, 0.35, 30e-6, 1300, '#d8d4c4'],
      ['Nylon 12', 'nylon', 1.01, 1.4, 0.4, 40, 50, 0.25, 100e-6, 1700, '#e6e2d6'],
      ['Polycarbonate', 'polycarbonate', 1.2, 2.4, 0.37, 62, 66, 0.2, 65e-6, 1200, '#e4eef0'],
      ['Polycarbonate 20% Glass', 'polycarbonate', 1.34, 5.5, 0.37, 90, 95, 0.24, 35e-6, 1150, '#d6dee0'],
      ['Acrylic (PMMA)', 'acrylic', 1.18, 3.2, 0.37, 70, 72, 0.19, 70e-6, 1470, '#eaf3f6'],
      ['HDPE', 'polyethylene', 0.95, 1.1, 0.42, 26, 33, 0.48, 120e-6, 1900, '#e9eaea'],
      ['LDPE', 'polyethylene', 0.92, 0.25, 0.45, 11, 12, 0.33, 180e-6, 2300, '#eceded'],
      ['UHMW-PE', 'polyethylene', 0.94, 0.7, 0.46, 21, 40, 0.42, 150e-6, 1840, '#eceded'],
      ['Polypropylene', 'polypropylene', 0.9, 1.5, 0.42, 33, 35, 0.15, 100e-6, 1900, '#e5e7e4'],
      ['PTFE', 'ptfe', 2.17, 0.5, 0.46, 15, 27, 0.25, 135e-6, 1000, '#f4f4f2'],
      ['PVC (rigid)', 'pvc', 1.4, 3.0, 0.38, 45, 52, 0.16, 55e-6, 900, '#d5d8d2'],
      ['PEEK', 'peek', 1.32, 3.9, 0.4, 97, 100, 0.25, 47e-6, 320, '#a08a5a'],
      ['PEI (Ultem)', 'other', 1.27, 3.2, 0.36, 105, 110, 0.22, 56e-6, 1000, '#b08840'],
      ['Acetal (POM)', 'other', 1.41, 3.1, 0.35, 65, 70, 0.31, 110e-6, 1500, '#eeece6'],
      ['Polystyrene', 'polystyrene', 1.05, 3.2, 0.34, 45, 48, 0.14, 70e-6, 1300, '#eceff0'],
      ['HIPS', 'polystyrene', 1.04, 2.0, 0.35, 25, 30, 0.16, 80e-6, 1300, '#e8eaea'],
      ['TPU (85A)', 'elastomer', 1.12, 0.03, 0.48, null, 40, 0.2, 150e-6, 1700, '#c9c6c0'],
      ['Epoxy (cast)', 'epoxy', 1.2, 3.0, 0.35, 60, 70, 0.2, 60e-6, 1000, '#cbbfa4'],
      ['Phenolic', 'other', 1.36, 5.5, 0.35, 60, 65, 0.25, 30e-6, 1300, '#5a4632'],
    ],
  ],

  [
    'wood',
    [
      ['Oak, Red', 'hardwood', 0.63, 12.5, 0.35, null, 99, 0.17, 5.0e-6, 1700, WOOD],
      ['Oak, White', 'hardwood', 0.68, 12.3, 0.35, null, 105, 0.18, 4.9e-6, 1700, '#a8845a'],
      ['Maple, Hard', 'hardwood', 0.63, 12.6, 0.35, null, 109, 0.17, 5.0e-6, 1700, '#d8bd92'],
      ['Walnut, Black', 'hardwood', 0.55, 11.6, 0.35, null, 101, 0.15, 4.6e-6, 1700, '#5c4030'],
      ['Birch, Yellow', 'hardwood', 0.62, 13.9, 0.35, null, 114, 0.17, 5.0e-6, 1700, '#d5c09a'],
      ['Mahogany', 'hardwood', 0.55, 10.3, 0.35, null, 79, 0.15, 4.5e-6, 1700, '#7d4632'],
      ['Teak', 'hardwood', 0.63, 12.3, 0.35, null, 100, 0.17, 4.0e-6, 1700, '#9c7746'],
      ['Pine, Yellow', 'softwood', 0.51, 11.2, 0.3, null, 88, 0.12, 5.0e-6, 1800, '#dcc79b'],
      ['Cedar, Western Red', 'softwood', 0.35, 7.7, 0.3, null, 51, 0.09, 4.5e-6, 1800, '#b07a52'],
      ['Balsa', 'softwood', 0.16, 3.4, 0.3, null, 19, 0.05, 5.0e-6, 2900, '#e6dcc0'],
      ['Plywood', 'engineered-wood', 0.6, 9.0, 0.3, null, 40, 0.13, 6.0e-6, 1600, '#cdb48a'],
      ['MDF', 'engineered-wood', 0.75, 3.6, 0.3, null, 18, 0.14, 6.0e-6, 1700, '#b39468'],
      ['Bamboo (laminated)', 'engineered-wood', 0.7, 14.0, 0.3, null, 120, 0.17, 4.0e-6, 1600, '#d9c08a'],
    ],
  ],

  [
    'glass',
    [
      ['Soda-Lime Glass', 'silicate-glass', 2.52, 72, 0.23, null, 50, 1.0, 9.0e-6, 840, GLASS],
      ['Borosilicate Glass', 'silicate-glass', 2.23, 64, 0.2, null, 35, 1.14, 3.3e-6, 830, GLASS],
      ['Fused Silica', 'silicate-glass', 2.2, 73, 0.17, null, 48, 1.38, 0.55e-6, 740, GLASS],
      ['Tempered Glass', 'silicate-glass', 2.5, 72, 0.23, null, 120, 1.0, 9.0e-6, 840, GLASS],
    ],
  ],

  [
    'ceramic',
    [
      ['Alumina 96%', 'technical-ceramic', 3.72, 303, 0.21, null, 310, 25, 8.2e-6, 880, CERAMIC],
      ['Alumina 99.5%', 'technical-ceramic', 3.89, 375, 0.22, null, 379, 35, 8.4e-6, 880, CERAMIC],
      ['Zirconia (Y-TZP)', 'technical-ceramic', 6.05, 210, 0.31, null, 900, 2.0, 10.3e-6, 400, '#f0efeb'],
      ['Silicon Carbide', 'technical-ceramic', 3.1, 410, 0.14, null, 550, 120, 4.0e-6, 750, '#4a4d50'],
      ['Silicon Nitride', 'technical-ceramic', 3.2, 310, 0.27, null, 700, 30, 3.3e-6, 700, '#6b6960'],
      ['Boron Carbide', 'technical-ceramic', 2.52, 450, 0.17, null, 350, 30, 5.0e-6, 950, '#3a3d40'],
      ['Cordierite', 'technical-ceramic', 2.3, 70, 0.25, null, 120, 3.0, 2.0e-6, 800, '#d6cdb8'],
      ['Macor', 'technical-ceramic', 2.52, 66.9, 0.29, null, 94, 1.46, 9.3e-6, 790, '#efece2'],
    ],
  ],

  [
    'rubber',
    [
      ['Natural Rubber', 'elastomer', 0.93, 0.002, 0.49, null, 25, 0.15, 220e-6, 1900, RUBBER],
      ['Nitrile (NBR)', 'elastomer', 1.2, 0.005, 0.49, null, 20, 0.25, 230e-6, 1900, RUBBER],
      ['EPDM', 'elastomer', 1.1, 0.005, 0.49, null, 17, 0.2, 200e-6, 2000, RUBBER],
      ['Silicone Rubber', 'elastomer', 1.15, 0.005, 0.48, null, 10, 0.25, 250e-6, 1300, '#c4b8b0'],
      ['Neoprene (CR)', 'elastomer', 1.42, 0.007, 0.49, null, 24, 0.19, 220e-6, 1700, RUBBER],
      ['Viton (FKM)', 'elastomer', 1.85, 0.008, 0.48, null, 14, 0.2, 160e-6, 1200, '#3a2a24'],
      ['Butyl Rubber', 'elastomer', 0.92, 0.003, 0.49, null, 18, 0.13, 190e-6, 1900, RUBBER],
    ],
  ],

  [
    'composite',
    [
      ['Carbon Fibre / Epoxy (UD)', 'fiber-composite', 1.6, 135, 0.3, null, 1500, 5.0, -0.5e-6, 900, COMPOSITE],
      ['Carbon Fibre / Epoxy (woven)', 'fiber-composite', 1.55, 70, 0.1, null, 600, 3.0, 2.0e-6, 900, COMPOSITE],
      ['E-Glass / Epoxy (UD)', 'fiber-composite', 1.97, 45, 0.28, null, 1000, 0.6, 6.0e-6, 900, '#cfd3cf'],
      ['Kevlar 49 / Epoxy', 'fiber-composite', 1.38, 76, 0.34, null, 1400, 0.9, -2.0e-6, 1100, '#c8a13a'],
      ['G-10 / FR-4 Laminate', 'fiber-composite', 1.85, 24, 0.15, null, 310, 0.29, 11.0e-6, 1100, '#9aa053'],
      ['SMC (Sheet Moulding Compound)', 'fiber-composite', 1.85, 13, 0.3, null, 80, 0.3, 20e-6, 1000, '#8d9095'],
    ],
  ],

  [
    'fluid',
    [
      ['Water (20 °C)', 'liquid', 0.998, null, null, null, null, 0.598, 207e-6, 4182, FLUID],
      ['Air (20 °C)', 'gas', 0.0012, null, null, null, null, 0.026, 3400e-6, 1005, '#dbe9ef'],
      ['Engine Oil SAE 30', 'liquid', 0.88, null, null, null, null, 0.145, 700e-6, 1900, '#8a6a2a'],
      ['Hydraulic Oil ISO 46', 'liquid', 0.87, null, null, null, null, 0.14, 700e-6, 1900, '#9a7b32'],
      ['Ethylene Glycol', 'liquid', 1.11, null, null, null, null, 0.252, 570e-6, 2380, '#9fd08a'],
      ['Mercury', 'liquid', 13.53, null, null, null, null, 8.3, 181e-6, 140, '#b9bcc0'],
    ],
  ],

  [
    'other',
    [
      ['Concrete', 'other', 2.4, 30, 0.2, null, 3, 1.7, 12e-6, 880, '#a6a49e'],
      ['Cork', 'other', 0.19, 0.03, 0.25, null, 1.5, 0.045, 130e-6, 1900, '#c9a06a'],
      ['Leather', 'other', 0.95, 0.1, 0.4, null, 25, 0.14, 100e-6, 1500, '#7a5138'],
      ['Cardboard', 'other', 0.7, 2.0, 0.3, null, 25, 0.06, 20e-6, 1400, '#c3a887'],
      ['Polyurethane Foam (rigid)', 'other', 0.05, 0.03, 0.3, null, 0.7, 0.026, 70e-6, 1400, '#e8e2cf'],
      ['Graphite (isotropic)', 'other', 1.8, 11, 0.2, null, 40, 120, 4.5e-6, 710, '#3c3f43'],
      ['Ice (0 °C)', 'other', 0.917, 9.1, 0.33, null, 1.7, 2.2, 51e-6, 2050, '#dff2f7'],
    ],
  ],
]

/** The finish a category's materials get unless one says otherwise. */
const CATEGORY_FINISH: Readonly<Record<MaterialCategory, MaterialFinish>> = {
  metal: 'satin',
  plastic: 'matte',
  ceramic: 'matte',
  wood: 'matte',
  glass: 'polished',
  rubber: 'matte',
  composite: 'gloss',
  fluid: 'gloss',
  other: 'matte',
}

/** Which appearance preset a subcategory renders with, when one fits. */
const SUBCATEGORY_APPEARANCE: Readonly<Record<string, string>> = {
  'carbon-steel': 'steel-satin',
  'alloy-steel': 'steel-satin',
  'tool-steel': 'steel-polished',
  'stainless-steel': 'stainless-brushed',
  'cast-iron': 'steel-cast',
  aluminum: 'aluminum-brushed',
  titanium: 'titanium-satin',
  copper: 'copper-polished',
  brass: 'brass-polished',
  bronze: 'bronze-satin',
  nickel: 'steel-satin',
  magnesium: 'aluminum-cast',
  zinc: 'zinc-galvanized',
  precious: 'gold-polished',
  refractory: 'steel-satin',
  abs: 'abs-natural',
  pla: 'plastic-matte-white',
  nylon: 'nylon-natural',
  polycarbonate: 'plastic-glossy-white',
  acrylic: 'acrylic-clear',
  ptfe: 'ptfe-white',
  polyethylene: 'plastic-matte-white',
  polypropylene: 'plastic-matte-white',
  polystyrene: 'plastic-glossy-white',
  pvc: 'plastic-matte-white',
  peek: 'plastic-matte-black',
  'silicate-glass': 'glass-clear',
  'technical-ceramic': 'plastic-matte-white',
  elastomer: 'rubber-black',
  hardwood: 'wood-oak',
  softwood: 'wood-pine',
  'engineered-wood': 'wood-maple',
  'fiber-composite': 'carbon-fiber',
}

function buildMaterial(category: MaterialCategory, row: MaterialRow): PhysicalMaterial {
  const [
    name,
    subcategory,
    density,
    youngsModulus,
    poissonsRatio,
    yieldStrength,
    ultimateTensileStrength,
    thermalConductivity,
    thermalExpansion,
    specificHeat,
    color,
  ] = row

  return new PhysicalMaterial({
    id: slugify(name),
    name,
    category,
    subcategory,
    density,
    youngsModulus,
    poissonsRatio,
    yieldStrength,
    ultimateTensileStrength,
    thermalConductivity,
    thermalExpansion,
    specificHeat,
    color,
    finish: CATEGORY_FINISH[category],
    source: 'Typical handbook values (MatWeb / ASM / CES)',
    appearanceId: SUBCATEGORY_APPEARANCE[subcategory] ?? null,
  })
}

/** The material a body falls back to when nothing has been assigned. */
export const DEFAULT_MATERIAL_ID = 'aluminium-6061-t6'

export interface PropertyRange {
  readonly min?: number
  readonly max?: number
}

export interface MaterialQuery {
  /** Matched against the name and the id, case-insensitively. */
  readonly text?: string
  readonly category?: MaterialCategory
  readonly subcategory?: string
  readonly density?: PropertyRange
  readonly youngsModulus?: PropertyRange
  readonly yieldStrength?: PropertyRange
  readonly ultimateTensileStrength?: PropertyRange
  readonly thermalConductivity?: PropertyRange
  /** Restricts the result to the favourites. */
  readonly favoritesOnly?: boolean
}

/** One node of the browser's category tree. */
export interface MaterialTreeNode {
  readonly category: MaterialCategory
  readonly subcategories: readonly {
    readonly subcategory: string
    readonly materials: readonly PhysicalMaterial[]
  }[]
}

export interface MaterialLibraryJSON {
  /** Only user-defined materials are written; the built-ins ship with the app. */
  readonly custom: readonly PhysicalMaterialJSON[]
  readonly favorites: readonly string[]
}

/**
 * The built-in materials plus whatever the user has added.
 *
 * Built-ins are constructed once, lazily, and shared by every library instance
 * — there are a hundred and forty of them and they never change. A user-defined
 * material with the same id shadows the built-in rather than replacing it, so
 * deleting the custom one brings the standard material back.
 */
export class MaterialLibrary {
  readonly #custom = new Map<string, PhysicalMaterial>()
  readonly #favorites = new Set<string>()

  /** Every material: built-ins in library order, then custom ones. */
  get all(): PhysicalMaterial[] {
    const merged = new Map<string, PhysicalMaterial>(builtInMaterials())
    for (const [id, material] of this.#custom) merged.set(id, material)
    return [...merged.values()]
  }

  get builtIn(): PhysicalMaterial[] {
    return [...builtInMaterials().values()]
  }

  get customMaterials(): PhysicalMaterial[] {
    return [...this.#custom.values()]
  }

  get size(): number {
    return this.all.length
  }

  get(id: string): PhysicalMaterial | undefined {
    return this.#custom.get(id) ?? builtInMaterials().get(id)
  }

  /** The material, or the library default when the id is unknown. */
  resolve(id: string | null | undefined): PhysicalMaterial {
    if (id) {
      const found = this.get(id)
      if (found) return found
    }
    return this.get(DEFAULT_MATERIAL_ID) as PhysicalMaterial
  }

  /** Looks a material up by display name — what a BOM column carries. */
  findByName(name: string): PhysicalMaterial | undefined {
    const needle = name.trim().toLowerCase()
    return this.all.find((material) => material.name.toLowerCase() === needle)
  }

  byCategory(category: MaterialCategory): PhysicalMaterial[] {
    return this.all.filter((material) => material.category === category)
  }

  bySubcategory(subcategory: string): PhysicalMaterial[] {
    return this.all.filter((material) => material.subcategory === subcategory)
  }

  /**
   * Category → subcategory → materials, in the order the categories are
   * declared. Empty categories are dropped so the tree has no dead branches.
   */
  tree(): MaterialTreeNode[] {
    const nodes: MaterialTreeNode[] = []

    for (const category of MATERIAL_CATEGORIES) {
      const materials = this.byCategory(category)
      if (materials.length === 0) continue

      const grouped = new Map<string, PhysicalMaterial[]>()
      for (const material of materials) {
        const bucket = grouped.get(material.subcategory)
        if (bucket) bucket.push(material)
        else grouped.set(material.subcategory, [material])
      }

      nodes.push({
        category,
        subcategories: [...grouped.entries()].map(([subcategory, entries]) => ({
          subcategory,
          materials: entries,
        })),
      })
    }
    return nodes
  }

  /** Everything matching every clause of the query — clauses are ANDed. */
  search(query: MaterialQuery | string = {}): PhysicalMaterial[] {
    const criteria: MaterialQuery = typeof query === 'string' ? { text: query } : query
    const needle = criteria.text?.trim().toLowerCase() ?? ''

    return this.all.filter((material) => {
      if (needle !== '') {
        const haystack = `${material.name} ${material.id} ${material.subcategory}`.toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      if (criteria.category !== undefined && material.category !== criteria.category) return false
      if (criteria.subcategory !== undefined && material.subcategory !== criteria.subcategory) {
        return false
      }
      if (criteria.favoritesOnly === true && !this.#favorites.has(material.id)) return false

      return (
        inRange(material.density, criteria.density) &&
        inRange(material.youngsModulus, criteria.youngsModulus) &&
        inRange(material.yieldStrength, criteria.yieldStrength) &&
        inRange(material.ultimateTensileStrength, criteria.ultimateTensileStrength) &&
        inRange(material.thermalConductivity, criteria.thermalConductivity)
      )
    })
  }

  // ------------------------------------------------------- user definitions

  /** Adds or replaces a user-defined material. */
  add(material: PhysicalMaterial): PhysicalMaterial {
    const stored = material.custom ? material : material.with({ custom: true })
    this.#custom.set(stored.id, stored)
    return stored
  }

  /**
   * Edits a material in place. Editing a built-in copies it into the user's
   * materials first, which is what keeps the shipped data honest — a document
   * that says "AISI 1018" always means the standard one unless this library
   * says otherwise.
   */
  update(id: string, changes: Parameters<PhysicalMaterial['with']>[0]): PhysicalMaterial | null {
    const existing = this.get(id)
    if (!existing) return null
    return this.add(existing.with({ ...changes, id, custom: true }))
  }

  /** Only user-defined materials can be removed. */
  remove(id: string): boolean {
    this.#favorites.delete(id)
    return this.#custom.delete(id)
  }

  // ------------------------------------------------------------- favourites

  get favorites(): string[] {
    return [...this.#favorites]
  }

  isFavorite(id: string): boolean {
    return this.#favorites.has(id)
  }

  /** Marks a material as a favourite. Unknown ids are ignored. */
  addFavorite(id: string): boolean {
    if (!this.get(id)) return false
    this.#favorites.add(id)
    return true
  }

  removeFavorite(id: string): boolean {
    return this.#favorites.delete(id)
  }

  /** Flips the favourite flag and reports what it ended up as. */
  toggleFavorite(id: string): boolean {
    if (this.#favorites.has(id)) {
      this.#favorites.delete(id)
      return false
    }
    return this.addFavorite(id)
  }

  favoriteMaterials(): PhysicalMaterial[] {
    return [...this.#favorites]
      .map((id) => this.get(id))
      .filter((material): material is PhysicalMaterial => material !== undefined)
  }

  // ----------------------------------------------------------------- format

  toJSON(): MaterialLibraryJSON {
    return {
      custom: this.customMaterials.map((material) => material.toJSON()),
      favorites: this.favorites,
    }
  }

  static fromJSON(value: unknown): MaterialLibrary {
    const library = new MaterialLibrary()
    if (typeof value !== 'object' || value === null) return library
    const candidate = value as Record<string, unknown>

    if (Array.isArray(candidate.custom)) {
      for (const entry of candidate.custom) {
        try {
          library.add(PhysicalMaterial.fromJSON(entry))
        } catch {
          // A material this build cannot read is dropped, not fatal to the open.
        }
      }
    }
    if (Array.isArray(candidate.favorites)) {
      for (const id of candidate.favorites) {
        if (typeof id === 'string') library.addFavorite(id)
      }
    }
    return library
  }
}

let BUILT_INS: Map<string, PhysicalMaterial> | null = null

/** The shipped materials, built once and shared. */
export function builtInMaterials(): ReadonlyMap<string, PhysicalMaterial> {
  if (BUILT_INS === null) {
    BUILT_INS = new Map()
    for (const [category, rows] of TABLE) {
      for (const row of rows) {
        const material = buildMaterial(category, row)
        BUILT_INS.set(material.id, material)
      }
    }
  }
  return BUILT_INS
}

/** How many materials ship with the app. */
export function builtInMaterialCount(): number {
  return builtInMaterials().size
}

function inRange(value: number | null, range: PropertyRange | undefined): boolean {
  if (range === undefined) return true
  // A material with no measured value cannot satisfy a range on it.
  if (value === null) return false
  if (range.min !== undefined && value < range.min) return false
  if (range.max !== undefined && value > range.max) return false
  return true
}
