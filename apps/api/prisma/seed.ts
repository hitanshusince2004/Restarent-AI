import { PrismaClient, UserStatus, SystemRole, RestaurantStatus, OutletStatus, TableStatus, TableShape, QrCodeStatus, FoodType, SpiceLevel, MenuItemStatus, ModifierSelectionType } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { Permission } from '@restaurant-os/types';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Permissions
  console.log('Seeding system permissions...');
  const permissionsList = Object.values(Permission);
  for (const perm of permissionsList) {
    await prisma.permission.upsert({
      where: { name: perm },
      create: { name: perm, description: `Permission for ${perm}` },
      update: {},
    });
  }

  // 2. Seed Default Owner User
  console.log('Seeding demo owner account...');
  const ownerPasswordHash = await argon2.hash('Password123!', {
    type: argon2.argon2id,
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@spicesymphony.in' },
    create: {
      email: 'owner@spicesymphony.in',
      name: 'Vikram Malhotra',
      phone: '+919876543210',
      passwordHash: ownerPasswordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
    update: {},
  });

  // 3. Seed Restaurant
  console.log('Seeding demo restaurant...');
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'the-spice-symphony' },
    create: {
      name: 'The Spice Symphony',
      slug: 'the-spice-symphony',
      description: 'Authentic Indian Fine Dining & Tandoor Specialists',
      phone: '+918023456789',
      email: 'contact@spicesymphony.in',
      address: '100 Feet Road, HAL 2nd Stage, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'IN',
      pincode: '560038',
      currency: 'INR',
      status: RestaurantStatus.ACTIVE,
      defaultTaxRate: 5.0,
      gstNumber: '29ABCDE1234F1Z5',
      fssaiNumber: '11223344556677',
    },
    update: {},
  });

  // 4. Seed Roles for Restaurant
  console.log('Seeding restaurant roles...');
  const allDbPermissions = await prisma.permission.findMany();

  for (const roleName of Object.values(SystemRole)) {
    const role = await prisma.role.upsert({
      where: { restaurantId_name: { restaurantId: restaurant.id, name: roleName } },
      create: {
        restaurantId: restaurant.id,
        name: roleName,
        systemRole: roleName,
        isSystem: true,
        description: `${roleName} role for restaurant`,
      },
      update: {},
    });

    if (roleName === SystemRole.OWNER) {
      // Owner gets all permissions
      for (const p of allDbPermissions) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
          create: { roleId: role.id, permissionId: p.id },
          update: {},
        });
      }

      // Link Owner User to Restaurant
      await prisma.restaurantUser.upsert({
        where: { restaurantId_userId: { restaurantId: restaurant.id, userId: owner.id } },
        create: {
          restaurantId: restaurant.id,
          userId: owner.id,
          roleId: role.id,
          isActive: true,
          acceptedAt: new Date(),
        },
        update: {},
      });
    }
  }

  // 5. Seed Outlet
  console.log('Seeding outlet and floors...');
  const outlet = await prisma.outlet.upsert({
    where: { id: 'outlet-indiranagar' },
    create: {
      id: 'outlet-indiranagar',
      restaurantId: restaurant.id,
      name: 'Indiranagar Flagship',
      address: '100 Feet Road, Indiranagar, Bengaluru',
      phone: '+918023456789',
      status: OutletStatus.ACTIVE,
      openingTime: '11:00',
      closingTime: '23:30',
      isCurrentlyOpen: true,
    },
    update: {},
  });

  // 6. Seed Floors
  const groundFloor = await prisma.floor.create({
    data: {
      outletId: outlet.id,
      name: 'Main Dining Hall',
      displayOrder: 1,
    },
  });

  const rooftopFloor = await prisma.floor.create({
    data: {
      outletId: outlet.id,
      name: 'Rooftop Lounge',
      displayOrder: 2,
    },
  });

  // 7. Seed Tables and Stable QR Codes
  console.log('Seeding tables & QR codes...');
  const tableData = [
    { name: 'Table 1', capacity: 2, floorId: groundFloor.id, token: 'qr-spice-t1-indiranagar-token-001' },
    { name: 'Table 2', capacity: 4, floorId: groundFloor.id, token: 'qr-spice-t2-indiranagar-token-002' },
    { name: 'Table 3', capacity: 4, floorId: groundFloor.id, token: 'qr-spice-t3-indiranagar-token-003' },
    { name: 'Table 4', capacity: 6, floorId: groundFloor.id, token: 'qr-spice-t4-indiranagar-token-004' },
    { name: 'Roof 1', capacity: 4, floorId: rooftopFloor.id, token: 'qr-spice-r1-indiranagar-token-005' },
    { name: 'Roof 2', capacity: 8, floorId: rooftopFloor.id, token: 'qr-spice-r2-indiranagar-token-006' },
  ];

  for (const t of tableData) {
    const table = await prisma.table.create({
      data: {
        outletId: outlet.id,
        floorId: t.floorId,
        name: t.name,
        capacity: t.capacity,
        status: TableStatus.AVAILABLE,
        shape: TableShape.RECTANGLE,
      },
    });

    const qrUrl = `http://localhost:3000/t/${t.token}`;
    const qrImage = await QRCode.toDataURL(qrUrl);

    await prisma.tableQrCode.create({
      data: {
        tableId: table.id,
        token: t.token,
        status: QrCodeStatus.ACTIVE,
        qrImageUrl: qrImage,
      },
    });
  }

  // 8. Seed Menu Categories
  console.log('Seeding menu categories & items...');
  const starters = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Starters & Tandoor',
      description: 'Clay oven kebabs and appetizers',
      displayOrder: 1,
      isActive: true,
    },
  });

  const mains = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Main Course',
      description: 'Traditional slow-cooked curries and gravies',
      displayOrder: 2,
      isActive: true,
    },
  });

  const breads = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Breads & Rice',
      description: 'Fresh tandoori rotis, naans, and fragrant biryanis',
      displayOrder: 3,
      isActive: true,
    },
  });

  const desserts = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Desserts & Beverages',
      description: 'Sweet indulgences and refreshing drinks',
      displayOrder: 4,
      isActive: true,
    },
  });

  // 9. Modifier Groups
  const spiceModGroup = await prisma.modifierGroup.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Spice Level',
      selectionType: ModifierSelectionType.SINGLE,
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      options: {
        create: [
          { name: 'Mild', additionalPrice: 0, isDefault: true, displayOrder: 1 },
          { name: 'Medium Spicy', additionalPrice: 0, displayOrder: 2 },
          { name: 'Extra Spicy', additionalPrice: 0, displayOrder: 3 },
        ],
      },
    },
  });

  const cheeseAddonGroup = await prisma.modifierGroup.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Add-ons',
      selectionType: ModifierSelectionType.MULTIPLE,
      isRequired: false,
      minSelections: 0,
      options: {
        create: [
          { name: 'Extra Butter', additionalPrice: 30.0, displayOrder: 1 },
          { name: 'Extra Cheese', additionalPrice: 50.0, displayOrder: 2 },
          { name: 'Raita', additionalPrice: 60.0, displayOrder: 3 },
        ],
      },
    },
  });

  // 10. Menu Items
  const items = [
    {
      categoryId: starters.id,
      name: 'Paneer Tikka Angara',
      description: 'Cottage cheese marinated in Kashmiri chili and tandoori spices, grilled in clay oven',
      basePrice: 320.0,
      foodType: FoodType.VEG,
      spiceLevel: SpiceLevel.MEDIUM,
      isRecommended: true,
      displayOrder: 1,
      taxRate: 5.0,
      modifierGroupIds: [spiceModGroup.id],
    },
    {
      categoryId: starters.id,
      name: 'Murgh Malai Tikka',
      description: 'Tender chicken thighs in rich cashew, cream, and green cardamom marinade',
      basePrice: 420.0,
      foodType: FoodType.NON_VEG,
      spiceLevel: SpiceLevel.MILD,
      isRecommended: true,
      displayOrder: 2,
      taxRate: 5.0,
      modifierGroupIds: [spiceModGroup.id],
    },
    {
      categoryId: mains.id,
      name: 'Butter Chicken Grand Trunk',
      description: 'Pulled tandoori chicken simmered in rich satin tomato gravy with fenugreek and butter',
      basePrice: 480.0,
      foodType: FoodType.NON_VEG,
      spiceLevel: SpiceLevel.MEDIUM,
      isRecommended: true,
      displayOrder: 1,
      taxRate: 5.0,
      modifierGroupIds: [spiceModGroup.id, cheeseAddonGroup.id],
    },
    {
      categoryId: mains.id,
      name: 'Dal Makhani Bukhara Style',
      description: 'Black lentils slow cooked overnight on clay oven with cultured white butter',
      basePrice: 340.0,
      foodType: FoodType.VEG,
      spiceLevel: SpiceLevel.MILD,
      isRecommended: true,
      displayOrder: 2,
      taxRate: 5.0,
      modifierGroupIds: [cheeseAddonGroup.id],
    },
    {
      categoryId: breads.id,
      name: 'Dum Biryani Awadhi',
      description: 'Long-grain basmati rice layered with fragrant spices, saffron, and choice of protein',
      basePrice: 380.0,
      foodType: FoodType.NON_VEG,
      spiceLevel: SpiceLevel.MEDIUM,
      isRecommended: true,
      displayOrder: 1,
      taxRate: 5.0,
      variants: [
        { name: 'Veg Dum Biryani', price: 340.0, isDefault: false, displayOrder: 1 },
        { name: 'Chicken Dum Biryani', price: 440.0, isDefault: true, displayOrder: 2 },
        { name: 'Mutton Dum Biryani', price: 560.0, isDefault: false, displayOrder: 3 },
      ],
      modifierGroupIds: [spiceModGroup.id, cheeseAddonGroup.id],
    },
    {
      categoryId: breads.id,
      name: 'Garlic Butter Naan',
      description: 'Leavened flatbread brushed with crushed roasted garlic and pure amul butter',
      basePrice: 85.0,
      foodType: FoodType.VEG,
      spiceLevel: SpiceLevel.NONE,
      isRecommended: false,
      displayOrder: 2,
      taxRate: 5.0,
    },
    {
      categoryId: desserts.id,
      name: 'Gulab Jamun with Rabri',
      description: 'Golden mawa dumplings soaked in cardamom saffron syrup, served on chilled rabri',
      basePrice: 180.0,
      foodType: FoodType.VEG,
      spiceLevel: SpiceLevel.NONE,
      isRecommended: true,
      displayOrder: 1,
      taxRate: 5.0,
    },
    {
      categoryId: desserts.id,
      name: 'Kesari Mango Lassi',
      description: 'Thick churned yogurt blended with Alphonso mango pulp and saffron strands',
      basePrice: 160.0,
      foodType: FoodType.VEG,
      spiceLevel: SpiceLevel.NONE,
      isRecommended: false,
      displayOrder: 2,
      taxRate: 5.0,
    },
  ];

  for (const itemData of items) {
    const { variants, modifierGroupIds, ...itemProps } = itemData;

    const createdItem = await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        status: MenuItemStatus.ACTIVE,
        ...itemProps,
        variants: variants
          ? {
              create: variants.map((v) => ({
                name: v.name,
                price: v.price,
                isDefault: v.isDefault,
                displayOrder: v.displayOrder,
                isActive: true,
              })),
            }
          : undefined,
        modifierGroups: modifierGroupIds
          ? {
              create: modifierGroupIds.map((mgId, idx) => ({
                modifierGroupId: mgId,
                displayOrder: idx + 1,
              })),
            }
          : undefined,
      },
    });
  }

  // 11. Settings
  console.log('Seeding restaurant settings...');
  const defaultSettings = [
    { key: 'business_name', value: 'The Spice Symphony Indiranagar' },
    { key: 'invoice_prefix', value: 'TSS' },
    { key: 'upi_id', value: 'spicesymphony@okhdfcbank' },
    { key: 'gst_rate_default', value: '5' },
    { key: 'wifi_name', value: 'SpiceSymphony_Guest' },
    { key: 'wifi_password', value: 'ButterChicken@2026' },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { restaurantId_key: { restaurantId: restaurant.id, key: s.key } },
      create: { restaurantId: restaurant.id, key: s.key, value: s.value },
      update: {},
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log('----------------------------------------------------');
  console.log('Credentials:');
  console.log('  Owner: owner@spicesymphony.in / Password123!');
  console.log('  Restaurant Slug: the-spice-symphony');
  console.log('  Sample Table 1 QR Token: qr-spice-t1-indiranagar-token-001');
  console.log('  Customer URL: http://localhost:3000/t/qr-spice-t1-indiranagar-token-001');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
