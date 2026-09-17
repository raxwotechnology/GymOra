require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const Gym = require("../models/Gym");
const Supplier = require("../models/Supplier");
const Supplement = require("../models/Supplement");

const DEMO_SUPPLIERS = [
  {
    name: "NutriForce Lanka",
    contactName: "Ashan Perera",
    phone: "+94 77 123 4567",
    email: "sales@nutriforcelanka.lk",
    address: "45 Galle Road, Colombo 03",
    website: "www.nutriforcelanka.lk",
    notes: "Primary supplier for protein powders. Reliable delivery within 2 days.",
    paymentTerms: "Net 30",
    isActive: true,
    rating: 5,
    ratingNotes: "Excellent quality and on-time delivery"
  },
  {
    name: "SportsMed Distributors",
    contactName: "Kavitha Jayasinghe",
    phone: "+94 11 456 7890",
    email: "orders@sportsmed.lk",
    address: "12 Nawala Road, Nugegoda",
    website: "www.sportsmed.lk",
    notes: "Recovery supplements and physio products. Minimum order LKR 15,000.",
    paymentTerms: "Net 15",
    isActive: true,
    rating: 4,
    ratingNotes: "Good range but slightly slow on reorders"
  },
  {
    name: "ActiveLife Imports",
    contactName: "Roshan Fernando",
    phone: "+94 76 987 6543",
    email: "import@activelife.lk",
    address: "88 Union Place, Colombo 02",
    website: "www.activelifeimports.lk",
    notes: "Pre-workout and energy supplement imports. International brands.",
    paymentTerms: "Prepaid",
    isActive: true,
    rating: 4,
    ratingNotes: "Great variety, pricing slightly high"
  },
  {
    name: "PeakFuel Wholesale",
    contactName: "Dilshan Wijesekara",
    phone: "+94 71 234 5678",
    email: "wholesale@peakfuel.lk",
    address: "23 Baseline Road, Colombo 09",
    website: "www.peakfuelwholesale.lk",
    notes: "Vitamins, minerals and micronutrient supplements. Bulk discounts available.",
    paymentTerms: "Net 45",
    isActive: true,
    rating: 5,
    ratingNotes: "Best bulk pricing on vitamins"
  },
  {
    name: "Island Fitness Supply",
    contactName: "Nadeeka Rathnayake",
    phone: "+94 75 321 9876",
    email: "supply@islandfitness.lk",
    address: "67 Rajagiriya Road, Rajagiriya",
    website: "www.islandfitnesssupply.lk",
    notes: "General gym supplements and accessories. Local brand support.",
    paymentTerms: "COD",
    isActive: true,
    rating: 3,
    ratingNotes: "Good local options but limited international brands"
  }
];

async function seedSuppliers() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const gyms = await Gym.find().lean();
  if (gyms.length === 0) {
    console.log("No gyms found. Run the main seed script first.");
    process.exit(0);
  }

  for (const gym of gyms) {
    const gymId = gym._id;
    console.log(`\nSeeding suppliers for gym: ${gym.name}`);

    const supplements = await Supplement.find({ gym: gymId }).lean();

    for (const supplierData of DEMO_SUPPLIERS) {
      const exists = await Supplier.findOne({ gym: gymId, name: supplierData.name }).lean();
      if (exists) {
        console.log(`  Supplier "${supplierData.name}" already exists — skipping`);
        continue;
      }

      const supplier = await Supplier.create({ ...supplierData, gym: gymId });

      // Link 1-2 random supplements to each supplier
      const linked = supplements.slice(0, Math.min(supplements.length, 3));
      for (const supp of linked.slice(0, 2)) {
        supplier.products.push({
          supplementId: supp._id,
          supplementName: supp.name,
          supplierPrice: Math.round(supp.buyingPrice || supp.unitPrice * 0.65),
          lastUpdated: new Date(),
          notes: "Standard supply contract"
        });
        // Update supplement's supplierId if not set
        if (!supp.supplierId) {
          await Supplement.findByIdAndUpdate(supp._id, { supplierId: supplier._id, supplierName: supplier.name });
        }
      }

      // Add a sample restock log entry
      if (linked.length > 0) {
        const s = linked[0];
        supplier.restockLog.push({
          supplementId: s._id,
          supplementName: s.name,
          qty: 50,
          unitCost: Math.round((s.buyingPrice || s.unitPrice * 0.65)),
          totalCost: 50 * Math.round((s.buyingPrice || s.unitPrice * 0.65)),
          orderedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          receivedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          status: "received",
          invoiceNumber: `INV-${Math.floor(Math.random() * 90000) + 10000}`,
          notes: "Regular monthly restock"
        });
      }

      await supplier.save();
      console.log(`  Created: ${supplier.name}`);
    }
  }

  console.log("\nSupplier seed complete.");
  process.exit(0);
}

seedSuppliers().catch((err) => { console.error(err); process.exit(1); });
