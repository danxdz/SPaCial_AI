import { db } from './database';

export interface SampleDataConfig {
  workshops: Array<{
    name: string;
    description: string;
  }>;
  workstations: Array<{
    name: string;
    workshop_id: number;
    description: string;
  }>;
  groups: Array<{
    name: string;
    description: string;
    permissions: string;
  }>;
  families: Array<{
    name: string;
    description: string;
  }>;
  products: Array<{
    name: string;
    description: string;
    family_id: number;
    workshop_id: number;
    workstation_id: number;
  }>;
  routes: Array<{
    name: string;
    description: string;
    product_id: number;
    workshop_id: number;
  }>;
  features: Array<{
    name: string;
    description: string;
    product_id: number;
    gamma_id?: number;
    target_value: number;
    tolerance_plus: number;
    tolerance_minus: number;
    unit: string;
  }>;
  gammas: Array<{
    name: string;
    product_id: number;
    sequence_number: number;
    operation_name: string;
    workstation: string;
    estimated_time: number;
    workshop_id?: number;
  }>;
  measurements: Array<{
    feature_id: number;
    route_id: number;
    product_id: number;
    gamma_id: number;
    measured_value: number;
    operator_id: number;
    workstation_id: number;
    workshop_id: number;
    notes?: string;
  }>;
}

export const sampleData: SampleDataConfig = {
  workshops: [
    {
      name: 'Assembly',
      description: 'Main assembly operations'
    },
    {
      name: 'Machining',
      description: 'Precision machining operations'
    },
    {
      name: 'Quality Control',
      description: 'Quality inspection and testing'
    },
    {
      name: 'Packaging',
      description: 'Final packaging and shipping'
    },
    {
      name: 'Maintenance',
      description: 'Equipment maintenance and repair'
    }
  ],

  workstations: [
    // Assembly workstations
    { name: 'Main Assembly Line', workshop_id: 1, description: 'Primary assembly operations' },
    { name: 'Sub Assembly Station', workshop_id: 1, description: 'Component sub-assembly' },
    { name: 'Final Assembly', workshop_id: 1, description: 'Final product assembly' },
    { name: 'Assembly Testing', workshop_id: 1, description: 'Assembly verification testing' },
    
    // Machining workstations
    { name: 'CNC Machining', workshop_id: 2, description: 'Computer numerical control machining' },
    { name: 'Precision Turning', workshop_id: 2, description: 'Precision turning operations' },
    { name: 'Milling Station', workshop_id: 2, description: 'Milling operations' },
    { name: 'Grinding Station', workshop_id: 2, description: 'Precision grinding operations' },
    
    // Quality Control workstations
    { name: 'Dimensional Check', workshop_id: 3, description: 'Precision dimensional measurements' },
    { name: 'Functional Testing', workshop_id: 3, description: 'Functional component testing' },
    { name: 'Final Inspection', workshop_id: 3, description: 'Final quality inspection' },
    { name: 'Metrology Lab', workshop_id: 3, description: 'Advanced measurement laboratory' },
    
    // Packaging workstations
    { name: 'Packaging Line', workshop_id: 4, description: 'Product packaging operations' },
    { name: 'Labeling Station', workshop_id: 4, description: 'Product labeling and marking' },
    { name: 'Shipping Prep', workshop_id: 4, description: 'Shipping preparation' },
    
    // Maintenance workstations
    { name: 'Preventive Maintenance', workshop_id: 5, description: 'Scheduled maintenance operations' },
    { name: 'Repair Station', workshop_id: 5, description: 'Equipment repair and troubleshooting' },
    { name: 'Calibration Lab', workshop_id: 5, description: 'Equipment calibration laboratory' }
  ],

  groups: [
    {
      name: 'Operators',
      description: 'Production line operators',
      permissions: 'measurements'
    },
    {
      name: 'Supervisors',
      description: 'Line supervisors and team leaders',
      permissions: 'measurements,reports'
    },
    {
      name: 'Quality Team',
      description: 'Quality control specialists',
      permissions: 'measurements,quality'
    },
    {
      name: 'Maintenance',
      description: 'Equipment maintenance technicians',
      permissions: 'maintenance'
    },
    {
      name: 'Engineers',
      description: 'Process and design engineers',
      permissions: 'measurements,reports,engineering'
    }
  ],

  families: [
    {
      name: 'Mechanical Components',
      description: 'Mechanical parts and assemblies'
    },
    {
      name: 'Electronic Components',
      description: 'Electronic parts and systems'
    },
    {
      name: 'Structural Components',
      description: 'Structural parts and assemblies'
    },
    {
      name: 'Quality Control Parts',
      description: 'Quality control and inspection components'
    },
    {
      name: 'Packaging Materials',
      description: 'Packaging and shipping materials'
    }
  ],

  products: [
    // Engine Components
    {
      name: 'Engine Block',
      description: 'Main engine block assembly',
      family_id: 1,
      workshop_id: 1,
      workstation_id: 1
    },
    {
      name: 'Cylinder Head',
      description: 'Engine cylinder head',
      family_id: 1,
      workshop_id: 1,
      workstation_id: 2
    },
    {
      name: 'Complete Engine',
      description: 'Fully assembled engine',
      family_id: 1,
      workshop_id: 1,
      workstation_id: 3
    },
    {
      name: 'Engine Test Unit',
      description: 'Tested and validated engine',
      family_id: 1,
      workshop_id: 1,
      workstation_id: 4
    },
    
    // Body Components
    {
      name: 'Vehicle Frame',
      description: 'Main vehicle frame structure',
      family_id: 2,
      workshop_id: 2,
      workstation_id: 5
    },
    {
      name: 'Body Panels',
      description: 'Vehicle body panels',
      family_id: 2,
      workshop_id: 2,
      workstation_id: 6
    },
    {
      name: 'Door Assembly',
      description: 'Complete door assembly',
      family_id: 2,
      workshop_id: 2,
      workstation_id: 7
    },
    {
      name: 'Body Inspection Unit',
      description: 'Inspected body assembly',
      family_id: 2,
      workshop_id: 2,
      workstation_id: 8
    },
    
    // Paint Systems
    {
      name: 'Pre-treated Body',
      description: 'Surface prepared body',
      family_id: 3,
      workshop_id: 3,
      workstation_id: 9
    },
    {
      name: 'Primed Body',
      description: 'Primer coated body',
      family_id: 3,
      workshop_id: 3,
      workstation_id: 10
    },
    {
      name: 'Base Coated Body',
      description: 'Base color applied body',
      family_id: 3,
      workshop_id: 3,
      workstation_id: 11
    },
    {
      name: 'Finished Body',
      description: 'Clear coated finished body',
      family_id: 3,
      workshop_id: 3,
      workstation_id: 12
    },
    
    // Quality Parts
    {
      name: 'Dimensional Check Unit',
      description: 'Dimensionally verified component',
      family_id: 4,
      workshop_id: 4,
      workstation_id: 13
    },
    {
      name: 'Functional Test Unit',
      description: 'Functionally tested component',
      family_id: 4,
      workshop_id: 4,
      workstation_id: 14
    },
    {
      name: 'Final Inspection Unit',
      description: 'Final quality inspected component',
      family_id: 4,
      workshop_id: 4,
      workstation_id: 15
    },
    
    // Final Assembly
    {
      name: 'Interior Assembly',
      description: 'Complete interior assembly',
      family_id: 5,
      workshop_id: 5,
      workstation_id: 16
    },
    {
      name: 'Electrical Assembly',
      description: 'Complete electrical system',
      family_id: 5,
      workshop_id: 5,
      workstation_id: 17
    },
    {
      name: 'Final Vehicle',
      description: 'Complete tested vehicle',
      family_id: 5,
      workshop_id: 5,
      workstation_id: 18
    }
  ],

  routes: [
    // Engine Assembly Routes
    {
      name: 'Engine Block Machining Route',
      description: 'Engine block precision machining process',
      product_id: 1,
      workshop_id: 1
    },
    {
      name: 'Cylinder Head Assembly Route',
      description: 'Cylinder head assembly and testing',
      product_id: 2,
      workshop_id: 1
    },
    {
      name: 'Complete Engine Assembly Route',
      description: 'Full engine assembly and testing',
      product_id: 3,
      workshop_id: 1
    },
    {
      name: 'Engine Testing Route',
      description: 'Engine performance and quality testing',
      product_id: 4,
      workshop_id: 1
    },
    
    // Body Shop Routes
    {
      name: 'Frame Welding Route',
      description: 'Vehicle frame welding and assembly',
      product_id: 5,
      workshop_id: 2
    },
    {
      name: 'Body Panel Assembly Route',
      description: 'Body panel assembly and installation',
      product_id: 6,
      workshop_id: 2
    },
    {
      name: 'Door Assembly Route',
      description: 'Door assembly and installation',
      product_id: 7,
      workshop_id: 2
    },
    {
      name: 'Body Inspection Route',
      description: 'Body quality inspection and validation',
      product_id: 8,
      workshop_id: 2
    },
    
    // Paint Shop Routes
    {
      name: 'Pre-treatment Route',
      description: 'Surface preparation and cleaning process',
      product_id: 9,
      workshop_id: 3
    },
    {
      name: 'Primer Application Route',
      description: 'Primer coating application process',
      product_id: 10,
      workshop_id: 3
    },
    {
      name: 'Base Coat Route',
      description: 'Base color application process',
      product_id: 11,
      workshop_id: 3
    },
    {
      name: 'Clear Coat Route',
      description: 'Clear protective coating process',
      product_id: 12,
      workshop_id: 3
    },
    
    // Quality Control Routes
    {
      name: 'Dimensional Check Route',
      description: 'Precision dimensional measurement process',
      product_id: 13,
      workshop_id: 4
    },
    {
      name: 'Functional Testing Route',
      description: 'Functional component testing process',
      product_id: 14,
      workshop_id: 4
    },
    {
      name: 'Final Inspection Route',
      description: 'Final quality inspection process',
      product_id: 15,
      workshop_id: 4
    },
    
    // Final Assembly Routes
    {
      name: 'Interior Assembly Route',
      description: 'Interior component installation process',
      product_id: 16,
      workshop_id: 5
    },
    {
      name: 'Electrical Systems Route',
      description: 'Electrical system installation process',
      product_id: 17,
      workshop_id: 5
    },
    {
      name: 'Final Testing Route',
      description: 'Final vehicle testing and validation',
      product_id: 18,
      workshop_id: 5
    }
  ],

  features: [
    // Engine Block features
    {
      name: 'Bore Diameter',
      description: 'Engine cylinder bore diameter',
      product_id: 1,
      gamma_id: 1,
      target_value: 85.0,
      tolerance_plus: 0.1,
      tolerance_minus: 0.1,
      unit: 'mm'
    },
    {
      name: 'Deck Height',
      description: 'Engine block deck height',
      product_id: 1,
      gamma_id: 2,
      target_value: 200.0,
      tolerance_plus: 0.05,
      tolerance_minus: 0.05,
      unit: 'mm'
    },
    {
      name: 'Block Weight',
      description: 'Engine block total weight',
      product_id: 1,
      gamma_id: 3,
      target_value: 45.5,
      tolerance_plus: 0.2,
      tolerance_minus: 0.2,
      unit: 'kg'
    },
    
    // Cylinder Head features
    {
      name: 'Compression Ratio',
      description: 'Engine compression ratio',
      product_id: 2,
      gamma_id: 4,
      target_value: 10.5,
      tolerance_plus: 0.1,
      tolerance_minus: 0.1,
      unit: 'ratio'
    },
    {
      name: 'Valve Seat Angle',
      description: 'Valve seat angle measurement',
      product_id: 2,
      gamma_id: 5,
      target_value: 45.0,
      tolerance_plus: 0.5,
      tolerance_minus: 0.5,
      unit: 'degrees'
    },
    {
      name: 'Head Thickness',
      description: 'Cylinder head thickness',
      product_id: 2,
      gamma_id: 4,
      target_value: 120.0,
      tolerance_plus: 0.1,
      tolerance_minus: 0.1,
      unit: 'mm'
    },
    
    // Body Parts features
    {
      name: 'Panel Thickness',
      description: 'Door panel thickness',
      product_id: 4,
      gamma_id: 6,
      target_value: 2.5,
      tolerance_plus: 0.05,
      tolerance_minus: 0.05,
      unit: 'mm'
    },
    {
      name: 'Surface Roughness',
      description: 'Panel surface roughness',
      product_id: 4,
      gamma_id: 7,
      target_value: 1.6,
      tolerance_plus: 0.2,
      tolerance_minus: 0.2,
      unit: 'μm'
    },
    {
      name: 'Panel Dimensions',
      description: 'Panel length and width',
      product_id: 4,
      gamma_id: 6,
      target_value: 1200.0,
      tolerance_plus: 2.0,
      tolerance_minus: 2.0,
      unit: 'mm'
    },
    
    // Electrical features
    {
      name: 'Wire Resistance',
      description: 'Wire harness resistance',
      product_id: 6,
      gamma_id: 8,
      target_value: 12.0,
      tolerance_plus: 0.5,
      tolerance_minus: 0.5,
      unit: 'ohms'
    },
    {
      name: 'Insulation Resistance',
      description: 'Wire insulation resistance',
      product_id: 6,
      gamma_id: 9,
      target_value: 1000.0,
      tolerance_plus: 50.0,
      tolerance_minus: 50.0,
      unit: 'MΩ'
    },
    {
      name: 'Wire Gauge',
      description: 'Wire thickness measurement',
      product_id: 6,
      gamma_id: 8,
      target_value: 2.5,
      tolerance_plus: 0.1,
      tolerance_minus: 0.1,
      unit: 'mm²'
    },
    
    // Machined Parts features
    {
      name: 'Shaft Diameter',
      description: 'Precision shaft diameter',
      product_id: 8,
      gamma_id: 10,
      target_value: 25.0,
      tolerance_plus: 0.01,
      tolerance_minus: 0.01,
      unit: 'mm'
    },
    {
      name: 'Surface Finish',
      description: 'Machined surface finish',
      product_id: 8,
      gamma_id: 11,
      target_value: 0.8,
      tolerance_plus: 0.1,
      tolerance_minus: 0.1,
      unit: 'μm'
    },
    {
      name: 'Shaft Length',
      description: 'Precision shaft length',
      product_id: 8,
      gamma_id: 10,
      target_value: 150.0,
      tolerance_plus: 0.05,
      tolerance_minus: 0.05,
      unit: 'mm'
    },
    
    // Welded Assemblies features
    {
      name: 'Weld Strength',
      description: 'Welded joint strength',
      product_id: 10,
      gamma_id: 12,
      target_value: 450.0,
      tolerance_plus: 25.0,
      tolerance_minus: 25.0,
      unit: 'MPa'
    },
    {
      name: 'Weld Penetration',
      description: 'Weld penetration depth',
      product_id: 10,
      gamma_id: 13,
      target_value: 8.0,
      tolerance_plus: 0.5,
      tolerance_minus: 0.5,
      unit: 'mm'
    },
    {
      name: 'Weld Length',
      description: 'Total weld seam length',
      product_id: 10,
      gamma_id: 12,
      target_value: 250.0,
      tolerance_plus: 5.0,
      tolerance_minus: 5.0,
      unit: 'mm'
    }
  ],

  gammas: [
    // Engine Block Manufacturing Route (Product 1) - Complete Manufacturing Process
    {
      name: 'Raw Block Preparation',
      product_id: 1,
      sequence_number: 10,
      operation_name: 'Material Inspection & Preparation',
      workstation: 'Block Machining',
      estimated_time: 30.0,
      workshop_id: 1
    },
    {
      name: 'Cylinder Bore Machining',
      product_id: 1,
      sequence_number: 20,
      operation_name: 'Precision Boring Operations',
      workstation: 'Block Machining',
      estimated_time: 120.0,
      workshop_id: 1
    },
    {
      name: 'Deck Surface Machining',
      product_id: 1,
      sequence_number: 30,
      operation_name: 'Deck Height & Surface Finish',
      workstation: 'Block Machining',
      estimated_time: 90.0,
      workshop_id: 1
    },
    {
      name: 'Block Cleaning & Inspection',
      product_id: 1,
      sequence_number: 40,
      operation_name: 'Cleaning & Dimensional Check',
      workstation: 'Engine Testing',
      estimated_time: 45.0,
      workshop_id: 1
    },
    {
      name: 'Final Block Testing',
      product_id: 1,
      sequence_number: 50,
      operation_name: 'Pressure & Leak Testing',
      workstation: 'Engine Testing',
      estimated_time: 60.0,
      workshop_id: 1
    },

    // Cylinder Head Manufacturing Route (Product 2) - Complete Head Manufacturing
    {
      name: 'Head Casting Preparation',
      product_id: 2,
      sequence_number: 10,
      operation_name: 'Casting Inspection & Cleaning',
      workstation: 'Cylinder Head Assembly',
      estimated_time: 25.0,
      workshop_id: 1
    },
    {
      name: 'Valve Seat Machining',
      product_id: 2,
      sequence_number: 20,
      operation_name: 'Precision Valve Seat Cutting',
      workstation: 'Cylinder Head Assembly',
      estimated_time: 75.0,
      workshop_id: 1
    },
    {
      name: 'Valve Guide Installation',
      product_id: 2,
      sequence_number: 30,
      operation_name: 'Valve Guide Press Fit',
      workstation: 'Cylinder Head Assembly',
      estimated_time: 40.0,
      workshop_id: 1
    },
    {
      name: 'Valve Installation',
      product_id: 2,
      sequence_number: 40,
      operation_name: 'Valve & Spring Assembly',
      workstation: 'Cylinder Head Assembly',
      estimated_time: 55.0,
      workshop_id: 1
    },
    {
      name: 'Head Final Testing',
      product_id: 2,
      sequence_number: 50,
      operation_name: 'Valve Seal & Pressure Testing',
      workstation: 'Engine Testing',
      estimated_time: 35.0,
      workshop_id: 1
    },

    // Complete Engine Assembly Route (Product 3) - Full Engine Assembly
    {
      name: 'Block Preparation',
      product_id: 3,
      sequence_number: 10,
      operation_name: 'Block Mounting & Alignment',
      workstation: 'Engine Assembly Line',
      estimated_time: 20.0,
      workshop_id: 1
    },
    {
      name: 'Piston Installation',
      product_id: 3,
      sequence_number: 20,
      operation_name: 'Piston & Connecting Rod Assembly',
      workstation: 'Engine Assembly Line',
      estimated_time: 45.0,
      workshop_id: 1
    },
    {
      name: 'Crankshaft Installation',
      product_id: 3,
      sequence_number: 30,
      operation_name: 'Crankshaft Mounting & Timing',
      workstation: 'Engine Assembly Line',
      estimated_time: 60.0,
      workshop_id: 1
    },
    {
      name: 'Head Installation',
      product_id: 3,
      sequence_number: 40,
      operation_name: 'Cylinder Head Mounting',
      workstation: 'Engine Assembly Line',
      estimated_time: 35.0,
      workshop_id: 1
    },
    {
      name: 'Engine Final Assembly',
      product_id: 3,
      sequence_number: 50,
      operation_name: 'Accessories & Final Components',
      workstation: 'Engine Assembly Line',
      estimated_time: 50.0,
      workshop_id: 1
    },
    {
      name: 'Engine Performance Testing',
      product_id: 3,
      sequence_number: 60,
      operation_name: 'Complete Engine Testing',
      workstation: 'Engine Testing',
      estimated_time: 90.0,
      workshop_id: 1
    },

    // Vehicle Frame Manufacturing Route (Product 4) - Complete Frame Manufacturing
    {
      name: 'Frame Material Preparation',
      product_id: 4,
      sequence_number: 10,
      operation_name: 'Steel Cutting & Preparation',
      workstation: 'Frame Welding',
      estimated_time: 40.0,
      workshop_id: 2
    },
    {
      name: 'Frame Welding',
      product_id: 4,
      sequence_number: 20,
      operation_name: 'Main Frame Structure Welding',
      workstation: 'Frame Welding',
      estimated_time: 180.0,
      workshop_id: 2
    },
    {
      name: 'Frame Inspection',
      product_id: 4,
      sequence_number: 30,
      operation_name: 'Weld Quality & Dimensional Check',
      workstation: 'Body Inspection',
      estimated_time: 60.0,
      workshop_id: 2
    },
    {
      name: 'Frame Finishing',
      product_id: 4,
      sequence_number: 40,
      operation_name: 'Surface Preparation & Coating',
      workstation: 'Body Panel Assembly',
      estimated_time: 45.0,
      workshop_id: 2
    },

    // Body Panels Manufacturing Route (Product 5) - Complete Panel Manufacturing
    {
      name: 'Panel Material Cutting',
      product_id: 5,
      sequence_number: 10,
      operation_name: 'Sheet Metal Cutting',
      workstation: 'Body Panel Assembly',
      estimated_time: 30.0,
      workshop_id: 2
    },
    {
      name: 'Panel Forming',
      product_id: 5,
      sequence_number: 20,
      operation_name: 'Press Forming Operations',
      workstation: 'Body Panel Assembly',
      estimated_time: 45.0,
      workshop_id: 2
    },
    {
      name: 'Panel Assembly',
      product_id: 5,
      sequence_number: 30,
      operation_name: 'Panel Joining & Assembly',
      workstation: 'Body Panel Assembly',
      estimated_time: 75.0,
      workshop_id: 2
    },
    {
      name: 'Panel Quality Check',
      product_id: 5,
      sequence_number: 40,
      operation_name: 'Dimensional & Surface Inspection',
      workstation: 'Body Inspection',
      estimated_time: 25.0,
      workshop_id: 2
    },

    // Door Assembly Route (Product 6) - Complete Door Manufacturing
    {
      name: 'Door Frame Assembly',
      product_id: 6,
      sequence_number: 10,
      operation_name: 'Door Frame Construction',
      workstation: 'Door Assembly',
      estimated_time: 50.0,
      workshop_id: 2
    },
    {
      name: 'Door Panel Installation',
      product_id: 6,
      sequence_number: 20,
      operation_name: 'Inner & Outer Panel Installation',
      workstation: 'Door Assembly',
      estimated_time: 40.0,
      workshop_id: 2
    },
    {
      name: 'Door Hardware Installation',
      product_id: 6,
      sequence_number: 30,
      operation_name: 'Hinges, Locks & Handles',
      workstation: 'Door Assembly',
      estimated_time: 35.0,
      workshop_id: 2
    },
    {
      name: 'Door Testing',
      product_id: 6,
      sequence_number: 40,
      operation_name: 'Function & Fit Testing',
      workstation: 'Body Inspection',
      estimated_time: 20.0,
      workshop_id: 2
    },

    // Pre-treated Body Route (Product 7) - Surface Preparation Process
    {
      name: 'Body Cleaning',
      product_id: 7,
      sequence_number: 10,
      operation_name: 'Degreasing & Cleaning',
      workstation: 'Pre-treatment',
      estimated_time: 30.0,
      workshop_id: 3
    },
    {
      name: 'Surface Preparation',
      product_id: 7,
      sequence_number: 20,
      operation_name: 'Phosphating Treatment',
      workstation: 'Pre-treatment',
      estimated_time: 45.0,
      workshop_id: 3
    },
    {
      name: 'Rinsing & Drying',
      product_id: 7,
      sequence_number: 30,
      operation_name: 'Final Rinse & Drying',
      workstation: 'Pre-treatment',
      estimated_time: 25.0,
      workshop_id: 3
    },

    // Primed Body Route (Product 8) - Primer Application Process
    {
      name: 'Primer Application',
      product_id: 8,
      sequence_number: 10,
      operation_name: 'Electrostatic Primer Application',
      workstation: 'Primer Application',
      estimated_time: 60.0,
      workshop_id: 3
    },
    {
      name: 'Primer Curing',
      product_id: 8,
      sequence_number: 20,
      operation_name: 'Primer Bake & Cure',
      workstation: 'Primer Application',
      estimated_time: 90.0,
      workshop_id: 3
    },
    {
      name: 'Primer Inspection',
      product_id: 8,
      sequence_number: 30,
      operation_name: 'Coating Quality Check',
      workstation: 'Primer Application',
      estimated_time: 20.0,
      workshop_id: 3
    },

    // Base Coated Body Route (Product 9) - Color Application Process
    {
      name: 'Base Coat Application',
      product_id: 9,
      sequence_number: 10,
      operation_name: 'Color Base Coat Application',
      workstation: 'Base Coat',
      estimated_time: 45.0,
      workshop_id: 3
    },
    {
      name: 'Base Coat Curing',
      product_id: 9,
      sequence_number: 20,
      operation_name: 'Base Coat Bake & Cure',
      workstation: 'Base Coat',
      estimated_time: 75.0,
      workshop_id: 3
    },

    // Finished Body Route (Product 10) - Clear Coat Process
    {
      name: 'Clear Coat Application',
      product_id: 10,
      sequence_number: 10,
      operation_name: 'Clear Protective Coating',
      workstation: 'Clear Coat',
      estimated_time: 40.0,
      workshop_id: 3
    },
    {
      name: 'Clear Coat Curing',
      product_id: 10,
      sequence_number: 20,
      operation_name: 'Clear Coat Bake & Cure',
      workstation: 'Clear Coat',
      estimated_time: 80.0,
      workshop_id: 3
    },
    {
      name: 'Final Paint Inspection',
      product_id: 10,
      sequence_number: 30,
      operation_name: 'Paint Quality & Finish Check',
      workstation: 'Clear Coat',
      estimated_time: 30.0,
      workshop_id: 3
    },

    // Interior Assembly Route (Product 11) - Complete Interior Manufacturing
    {
      name: 'Dashboard Installation',
      product_id: 11,
      sequence_number: 10,
      operation_name: 'Dashboard Assembly & Installation',
      workstation: 'Interior Assembly',
      estimated_time: 60.0,
      workshop_id: 5
    },
    {
      name: 'Seat Installation',
      product_id: 11,
      sequence_number: 20,
      operation_name: 'Front & Rear Seat Installation',
      workstation: 'Interior Assembly',
      estimated_time: 45.0,
      workshop_id: 5
    },
    {
      name: 'Interior Trim',
      product_id: 11,
      sequence_number: 30,
      operation_name: 'Door Panels & Trim Installation',
      workstation: 'Interior Assembly',
      estimated_time: 50.0,
      workshop_id: 5
    },
    {
      name: 'Interior Testing',
      product_id: 11,
      sequence_number: 40,
      operation_name: 'Function & Fit Testing',
      workstation: 'Interior Assembly',
      estimated_time: 25.0,
      workshop_id: 5
    },

    // Electrical Assembly Route (Product 12) - Complete Electrical System
    {
      name: 'Wire Harness Installation',
      product_id: 12,
      sequence_number: 10,
      operation_name: 'Main Wire Harness Routing',
      workstation: 'Electrical Systems',
      estimated_time: 70.0,
      workshop_id: 5
    },
    {
      name: 'ECU Installation',
      product_id: 12,
      sequence_number: 20,
      operation_name: 'Engine Control Unit Installation',
      workstation: 'Electrical Systems',
      estimated_time: 30.0,
      workshop_id: 5
    },
    {
      name: 'Sensor Installation',
      product_id: 12,
      sequence_number: 30,
      operation_name: 'Sensor & Actuator Installation',
      workstation: 'Electrical Systems',
      estimated_time: 40.0,
      workshop_id: 5
    },
    {
      name: 'Electrical Testing',
      product_id: 12,
      sequence_number: 40,
      operation_name: 'Electrical System Testing',
      workstation: 'Electrical Systems',
      estimated_time: 45.0,
      workshop_id: 5
    },

    // Final Vehicle Route (Product 13) - Complete Vehicle Assembly
    {
      name: 'Final Assembly',
      product_id: 13,
      sequence_number: 10,
      operation_name: 'Complete Vehicle Assembly',
      workstation: 'Final Testing',
      estimated_time: 120.0,
      workshop_id: 5
    },
    {
      name: 'System Integration',
      product_id: 13,
      sequence_number: 20,
      operation_name: 'All Systems Integration',
      workstation: 'Final Testing',
      estimated_time: 90.0,
      workshop_id: 5
    },
    {
      name: 'Final Quality Check',
      product_id: 13,
      sequence_number: 30,
      operation_name: 'Complete Quality Inspection',
      workstation: 'Final Testing',
      estimated_time: 60.0,
      workshop_id: 5
    },
    {
      name: 'Road Test',
      product_id: 13,
      sequence_number: 40,
      operation_name: 'Final Road Test & Validation',
      workstation: 'Final Testing',
      estimated_time: 45.0,
      workshop_id: 5
    }
  ],

  measurements: [
    // Engine Block measurements
    {
      feature_id: 1,
      route_id: 1,
      product_id: 1,
      gamma_id: 1,
      measured_value: 85.05,
      operator_id: 1,
      workstation_id: 1,
      workshop_id: 1,
      notes: 'Within tolerance'
    },
    {
      feature_id: 1,
      route_id: 1,
      product_id: 1,
      gamma_id: 1,
      measured_value: 84.98,
      operator_id: 1,
      workstation_id: 1,
      workshop_id: 1,
      notes: 'Good measurement'
    },
    {
      feature_id: 2,
      route_id: 1,
      product_id: 1,
      gamma_id: 2,
      measured_value: 200.02,
      operator_id: 1,
      workstation_id: 2,
      workshop_id: 1,
      notes: 'Excellent'
    },
    
    // Cylinder Head measurements
    {
      feature_id: 3,
      route_id: 2,
      product_id: 2,
      gamma_id: 4,
      measured_value: 10.6,
      operator_id: 2,
      workstation_id: 1,
      workshop_id: 1,
      notes: 'Slightly high but acceptable'
    },
    {
      feature_id: 4,
      route_id: 2,
      product_id: 2,
      gamma_id: 4,
      measured_value: 45.2,
      operator_id: 2,
      workstation_id: 1,
      workshop_id: 1,
      notes: 'Within spec'
    },
    
    // Body Parts measurements
    {
      feature_id: 5,
      route_id: 3,
      product_id: 4,
      gamma_id: 6,
      measured_value: 2.48,
      operator_id: 3,
      workstation_id: 1,
      workshop_id: 1,
      notes: 'Good thickness'
    },
    {
      feature_id: 6,
      route_id: 3,
      product_id: 4,
      gamma_id: 7,
      measured_value: 1.5,
      operator_id: 3,
      workstation_id: 2,
      workshop_id: 1,
      notes: 'Excellent finish'
    },
    
    // Electrical measurements
    {
      feature_id: 7,
      route_id: 4,
      product_id: 6,
      gamma_id: 8,
      measured_value: 11.8,
      operator_id: 4,
      workstation_id: 1,
      workshop_id: 1,
      notes: 'Good resistance'
    },
    {
      feature_id: 8,
      route_id: 4,
      product_id: 6,
      gamma_id: 9,
      measured_value: 1050.0,
      operator_id: 4,
      workstation_id: 2,
      workshop_id: 1,
      notes: 'Excellent insulation'
    },
    
    // Machined Parts measurements
    {
      feature_id: 9,
      route_id: 5,
      product_id: 8,
      gamma_id: 10,
      measured_value: 25.01,
      operator_id: 5,
      workstation_id: 10,
      workshop_id: 4,
      notes: 'Precision within spec'
    },
    {
      feature_id: 10,
      route_id: 5,
      product_id: 8,
      gamma_id: 11,
      measured_value: 0.75,
      operator_id: 5,
      workstation_id: 11,
      workshop_id: 4,
      notes: 'Excellent finish'
    },
    
    // Welded Assemblies measurements
    {
      feature_id: 11,
      route_id: 6,
      product_id: 10,
      gamma_id: 12,
      measured_value: 465.0,
      operator_id: 6,
      workstation_id: 13,
      workshop_id: 5,
      notes: 'Strong weld'
    },
    {
      feature_id: 12,
      route_id: 6,
      product_id: 10,
      gamma_id: 13,
      measured_value: 8.2,
      operator_id: 6,
      workstation_id: 14,
      workshop_id: 5,
      notes: 'Good penetration'
    }
  ]
};

export class SampleDataService {
  static async fillSampleData(): Promise<{ success: boolean; error?: string }> {
    try {
      // Clear existing data first
      await db.clearAllData();

      // Insert workshops
      for (const workshop of sampleData.workshops) {
        await db.execute(
          'INSERT INTO workshops (name, description) VALUES (?, ?)',
          [workshop.name, workshop.description]
        );
      }

      // Insert workstations
      for (const workstation of sampleData.workstations) {
        await db.execute(
          'INSERT INTO workstations (name, workshop_id, description) VALUES (?, ?, ?)',
          [workstation.name, workstation.workshop_id, workstation.description]
        );
      }

      // Insert groups
      for (const group of sampleData.groups) {
        await db.execute(
          'INSERT INTO groups (name, description, permissions) VALUES (?, ?, ?)',
          [group.name, group.description, group.permissions]
        );
      }

      // Insert families
      for (const family of sampleData.families) {
        await db.execute(
          'INSERT INTO families (name, description) VALUES (?, ?)',
          [family.name, family.description]
        );
      }

      // Insert products
      for (const product of sampleData.products) {
        await db.execute(
          'INSERT INTO products (name, description, family_id, workshop_id, workstation_id) VALUES (?, ?, ?, ?, ?)',
          [product.name, product.description, product.family_id, product.workshop_id, product.workstation_id]
        );
      }

      // Create family-workshop relationships based on products
      const familyWorkshopRelationships = await db.queryAll(`
        SELECT DISTINCT family_id, workshop_id 
        FROM products 
        WHERE family_id IS NOT NULL AND workshop_id IS NOT NULL
      `);
      
      for (const rel of familyWorkshopRelationships) {
        await db.execute(
          'INSERT INTO family_workshops (family_id, workshop_id) VALUES (?, ?)',
          [rel.family_id, rel.workshop_id]
        );
      }
      
      console.log(`Created ${familyWorkshopRelationships.length} family-workshop relationships`);

      // Insert routes
      for (const route of sampleData.routes) {
        await db.execute(
          'INSERT INTO routes (name, description, product_id, workshop_id) VALUES (?, ?, ?, ?)',
          [route.name, route.description, route.product_id, route.workshop_id]
        );
      }

      // Insert gammas FIRST (features reference gamma_id)
      for (const gamma of sampleData.gammas) {
        await db.execute(
          'INSERT INTO gammas (name, product_id, sequence_number, operation_name, workstation, estimated_time, workshop_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [gamma.name, gamma.product_id, gamma.sequence_number, gamma.operation_name, gamma.workstation, gamma.estimated_time, gamma.workshop_id || null]
        );
      }

      // Insert features AFTER gammas (since features reference gamma_id)
      for (const feature of sampleData.features) {
        await db.execute(
          'INSERT INTO features (name, description, gamma_id, product_id, target_value, tolerance_plus, tolerance_minus, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [feature.name, feature.description, feature.gamma_id, feature.product_id, feature.target_value, feature.tolerance_plus, feature.tolerance_minus, feature.unit]
        );
      }

      // Insert measurements
      for (const measurement of sampleData.measurements) {
        await db.execute(
          'INSERT INTO measurements (feature_id, route_id, product_id, gamma_id, measured_value, operator_id, workstation_id, workshop_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [measurement.feature_id, measurement.route_id, measurement.product_id, measurement.gamma_id, measurement.measured_value, measurement.operator_id, measurement.workstation_id, measurement.workshop_id, measurement.notes]
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error filling sample data:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async addSampleData(): Promise<{ success: boolean; error?: string }> {
    try {
      // Disable foreign key constraints temporarily
      await db.execute('PRAGMA foreign_keys = OFF');
      
      // Insert workshops (using INSERT OR IGNORE to avoid duplicates)
      for (const workshop of sampleData.workshops) {
        await db.execute(
          'INSERT OR IGNORE INTO workshops (name, description) VALUES (?, ?)',
          [workshop.name, workshop.description]
        );
      }

      // Insert workstations
      for (const workstation of sampleData.workstations) {
        await db.execute(
          'INSERT OR IGNORE INTO workstations (name, workshop_id, description) VALUES (?, ?, ?)',
          [workstation.name, workstation.workshop_id, workstation.description]
        );
      }

      // Insert groups
      for (const group of sampleData.groups) {
        await db.execute(
          'INSERT OR IGNORE INTO groups (name, description, permissions) VALUES (?, ?, ?)',
          [group.name, group.description, group.permissions]
        );
      }

      // Insert families
      for (const family of sampleData.families) {
        await db.execute(
          'INSERT OR IGNORE INTO families (name, description) VALUES (?, ?)',
          [family.name, family.description]
        );
      }

      // Insert products
      for (const product of sampleData.products) {
        await db.execute(
          'INSERT OR IGNORE INTO products (name, description, family_id, workshop_id, workstation_id) VALUES (?, ?, ?, ?, ?)',
          [product.name, product.description, product.family_id, product.workshop_id, product.workstation_id]
        );
      }

      // Create family-workshop relationships based on products
      const familyWorkshopRelationships = await db.queryAll(`
        SELECT DISTINCT family_id, workshop_id 
        FROM products 
        WHERE family_id IS NOT NULL AND workshop_id IS NOT NULL
      `);
      
      for (const rel of familyWorkshopRelationships) {
        await db.execute(
          'INSERT OR IGNORE INTO family_workshops (family_id, workshop_id) VALUES (?, ?)',
          [rel.family_id, rel.workshop_id]
        );
      }
      
      console.log(`Created ${familyWorkshopRelationships.length} family-workshop relationships`);

      // Insert routes
      for (const route of sampleData.routes) {
        await db.execute(
          'INSERT OR IGNORE INTO routes (name, description, product_id, workshop_id) VALUES (?, ?, ?, ?)',
          [route.name, route.description, route.product_id, route.workshop_id]
        );
      }

      // Insert gammas FIRST (features reference gamma_id)
      for (const gamma of sampleData.gammas) {
        await db.execute(
          'INSERT OR IGNORE INTO gammas (name, product_id, sequence_number, operation_name, workstation, estimated_time) VALUES (?, ?, ?, ?, ?, ?)',
          [gamma.name, gamma.product_id, gamma.sequence_number, gamma.operation_name, gamma.workstation, gamma.estimated_time]
        );
      }

      // Insert features AFTER gammas (since features reference gamma_id)
      for (const feature of sampleData.features) {
        await db.execute(
          'INSERT OR IGNORE INTO features (name, description, gamma_id, product_id, target_value, tolerance_plus, tolerance_minus, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [feature.name, feature.description, feature.gamma_id, feature.product_id, feature.target_value, feature.tolerance_plus, feature.tolerance_minus, feature.unit]
        );
      }

      // Insert measurements
      for (const measurement of sampleData.measurements) {
        await db.execute(
          'INSERT OR IGNORE INTO measurements (feature_id, route_id, product_id, gamma_id, measured_value, operator_id, workstation_id, workshop_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [measurement.feature_id, measurement.route_id, measurement.product_id, measurement.gamma_id, measurement.measured_value, measurement.operator_id, measurement.workstation_id, measurement.workshop_id, measurement.notes]
        );
      }

      // Re-enable foreign key constraints
      await db.execute('PRAGMA foreign_keys = ON');

      return { success: true };
    } catch (error) {
      console.error('Error adding sample data:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
