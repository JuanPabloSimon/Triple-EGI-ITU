use("inventario_hardware");

db.equipos_hardware.insertMany([
    {
        _id: "EQ-099",
        fabricante: "Asus",
        modelo: "ExpertCenter D500",
        tipo: "desktop",
        cpu: { marca: "Intel", modelo: "Core i5-13400", nucleos: 6, ram_gb: 16 },
        disco: { tipo: "SSD", capacidad_gb: 512 },
        sistema_operativo: "Ubuntu 22.04 LTS",
        monitor: {marca: "Asus", pulgadas: 24},
        mouse: "Asus MD100",
        teclado: "Asus KD200"
    }
]);

db.equipos_hardware.find({ tipo: "desktop" });

db.equipos_hardware.find(
    {tipo: "laptop", ram_gb: { $gt: 8 }},
    {fabricantes: 1, modelo: 1, ram_gb: 1, sistema_operativo: 1}
);

db.equipos_hardware.find({"disco.tipo": {$in: ["SSD", "NVMe"] } });

db.equipos_hardware.find({
    "cpu.marca": "Intel",
    "cpu.nucleos": {$gte: 6}
});

db.equipos_hardware.findOne({_id: "EQ-001"});

db.equipos_hardware.find({gpu: {$exists: true}});

db.equipos_hardware.updateOne(
    { _id: "EQ-001" },
    { $set: { sistema_operativo: "Ubuntu 24.04 LTS" } }
);

db.equipos_hardware.updateOne(
    { _id: "EQ-004" },
    { $set: { gpu: { marca: "NVIDIA", modelo: "RTX A2000", vram_gb: 12 } } }
);

db.equipos_hardware.updateMany(
    { tipo: "laptop" },
    { $inc: { "bateria.ciclos": 1 } }
);

db.equipos_hardware.deleteOne({ _id: "EQ-099" });

db.equipos_hardware.aggregate([
    { $group: { _id: "$tipo", total: { $sum: 1 } } }
]);

db.equipos_hardware.aggregate([
    { $group: {
            _id: "$fabricante",
            ram_promedio: { $avg: "$ram_gb" },
            cantidad:     { $sum: 1 }
        }},
    { $sort: { ram_promedio: -1 } }
]);

db.equipos_hardware.aggregate([
    { $group: { _id: "$sistema_operativo", total: { $sum: 1 } } },
    { $sort: { total: -1 } }
]);