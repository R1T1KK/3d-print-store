import { Pool } from "pg";

process.loadEnvFile(".env.local");

const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL });

const INITIAL_PRODUCTS = [
  {
    slug: "helical-gearbox",
    name: "Dual Helical Planetary Reducer",
    description: "High-torque reduction gearbox designed for robotics actuators and stepper motors.",
    basePrice: 84900,
    currency: "INR",
    stock: 24,
    materials: ["PLA", "PETG"],
    images: ["/preview-gearbox.png"],
    modelUrl: null,
    active: true,
  },
  {
    slug: "quadcopter-canopy",
    name: "Apex 5-Inch Drone Canopy & Arm Guards",
    description: "Aerodynamic FPV camera mount and arm protectors with crash impact absorption.",
    basePrice: 59900,
    currency: "INR",
    stock: 18,
    materials: ["TPU", "PETG"],
    images: ["/preview-drone.png"],
    modelUrl: null,
    active: true,
  },
  {
    slug: "robotic-gripper",
    name: "Adaptive Soft-Robotics Gripper Claw",
    description: "Compliant mechanism gripper suitable for picking delicate and irregular objects.",
    basePrice: 119000,
    currency: "INR",
    stock: 10,
    materials: ["PLA", "PETG"],
    images: ["/preview-gripper.png"],
    modelUrl: null,
    active: true,
  },
  {
    slug: "hex-cable-organizer",
    name: "Modular Honeycomb Cable Dock",
    description: "Geodesic desk cable routing system with magnetic interlocking base stations.",
    basePrice: 34900,
    currency: "INR",
    stock: 50,
    materials: ["PLA", "Resin"],
    images: ["/preview-organizer.png"],
    modelUrl: null,
    active: true,
  },
  {
    slug: "test-print-1",
    name: "Precision Calibration Cube (20mm)",
    description: "Dimensional calibration artifact for verifying XYZ axis accuracy and flow rate.",
    basePrice: 100, // ₹1 for test payments
    currency: "INR",
    stock: 999,
    materials: ["PLA"],
    images: ["/preview-cube.png"],
    modelUrl: null,
    active: true,
  },
];

async function main() {
  try {
    const res = await pool.query('SELECT count(*) FROM "Product"');
    const count = parseInt(res.rows[0].count, 10);
    console.log(`Current products in DB: ${count}`);

    if (count === 0) {
      console.log("Seeding initial products into database...");
      for (const p of INITIAL_PRODUCTS) {
        await pool.query(
          `INSERT INTO "Product" (id, slug, name, description, "basePrice", currency, stock, materials, images, "modelUrl", active)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (slug) DO NOTHING`,
          [p.slug, p.name, p.description, p.basePrice, p.currency, p.stock, p.materials, p.images, p.modelUrl, p.active]
        );
      }
      console.log("Seeding completed!");
    } else {
      console.log("Products already exist. Ensuring test-print-1 exists...");
      const testProd = INITIAL_PRODUCTS[4];
      await pool.query(
        `INSERT INTO "Product" (id, slug, name, description, "basePrice", currency, stock, materials, images, "modelUrl", active)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (slug) DO NOTHING`,
        [testProd.slug, testProd.name, testProd.description, testProd.basePrice, testProd.currency, testProd.stock, testProd.materials, testProd.images, testProd.modelUrl, testProd.active]
      );
    }
  } catch (err) {
    console.error("Error seeding products:", err);
  } finally {
    await pool.end();
  }
}

main();
