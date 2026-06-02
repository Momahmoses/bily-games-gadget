import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create super admin
  const hashedPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bilygamesgadget.com' },
    update: {},
    create: {
      email: 'admin@bilygamesgadget.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      emailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Seed categories (hierarchical)
  const categories = [
    { name: 'Mobile Devices', slug: 'mobile-devices', icon: '📱', children: [
      { name: 'Smartphones', slug: 'smartphones' },
      { name: 'Tablets & iPads', slug: 'tablets-ipads' },
      { name: 'Foldable Phones', slug: 'foldable-phones' },
      { name: 'Feature Phones', slug: 'feature-phones' },
    ]},
    { name: 'Phone Accessories', slug: 'phone-accessories', icon: '🔌', children: [
      { name: 'Chargers & Cables', slug: 'chargers-cables' },
      { name: 'Power Banks', slug: 'power-banks' },
      { name: 'Earphones & Headsets', slug: 'earphones-headsets' },
      { name: 'Phone Cases & Covers', slug: 'phone-cases' },
      { name: 'Screen Protectors', slug: 'screen-protectors' },
    ]},
    { name: 'Computers & Laptops', slug: 'computers-laptops', icon: '💻', children: [
      { name: 'Laptops', slug: 'laptops' },
      { name: 'Desktop PCs', slug: 'desktop-pcs' },
      { name: 'Gaming PCs', slug: 'gaming-pcs' },
      { name: 'PC Components', slug: 'pc-components' },
      { name: 'Computer Accessories', slug: 'computer-accessories' },
      { name: 'Monitors', slug: 'monitors' },
    ]},
    { name: 'Gaming', slug: 'gaming', icon: '🎮', children: [
      { name: 'Gaming Consoles', slug: 'gaming-consoles' },
      { name: 'Gaming Accessories', slug: 'gaming-accessories' },
      { name: 'Video Games', slug: 'video-games' },
      { name: 'Gaming Headsets', slug: 'gaming-headsets' },
      { name: 'VR Headsets', slug: 'vr-headsets' },
      { name: 'Gaming Gift Cards', slug: 'gaming-gift-cards' },
    ]},
    { name: 'Audio & Entertainment', slug: 'audio-entertainment', icon: '🎧', children: [
      { name: 'Bluetooth Speakers', slug: 'bluetooth-speakers' },
      { name: 'Smart Speakers', slug: 'smart-speakers' },
      { name: 'Soundbars', slug: 'soundbars' },
      { name: 'Studio Headphones', slug: 'studio-headphones' },
      { name: 'Home Theater', slug: 'home-theater' },
    ]},
    { name: 'Smart Devices & Wearables', slug: 'smart-wearables', icon: '⌚', children: [
      { name: 'Smartwatches', slug: 'smartwatches' },
      { name: 'Fitness Trackers', slug: 'fitness-trackers' },
      { name: 'Smart Rings', slug: 'smart-rings' },
      { name: 'Health Monitors', slug: 'health-monitors' },
    ]},
    { name: 'Cameras & Photography', slug: 'cameras-photography', icon: '📷', children: [
      { name: 'DSLR Cameras', slug: 'dslr-cameras' },
      { name: 'Mirrorless Cameras', slug: 'mirrorless-cameras' },
      { name: 'Action Cameras', slug: 'action-cameras' },
      { name: 'Drones', slug: 'drones' },
      { name: 'Camera Accessories', slug: 'camera-accessories' },
    ]},
    { name: 'Smart Home', slug: 'smart-home', icon: '🏠', children: [
      { name: 'Smart TVs', slug: 'smart-tvs' },
      { name: 'Smart Lights', slug: 'smart-lights' },
      { name: 'Smart Security', slug: 'smart-security' },
      { name: 'Smart Plugs', slug: 'smart-plugs' },
      { name: 'Home Automation', slug: 'home-automation' },
    ]},
    { name: 'Power & Energy', slug: 'power-energy', icon: '🔋', children: [
      { name: 'Solar Charging Kits', slug: 'solar-charging' },
      { name: 'UPS Systems', slug: 'ups-systems' },
      { name: 'Power Stations', slug: 'power-stations' },
      { name: 'Generators', slug: 'generators' },
    ]},
  ];

  for (const cat of categories) {
    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon || null,
        isActive: true,
      },
    });

    if (cat.children) {
      for (let i = 0; i < cat.children.length; i++) {
        const child = cat.children[i];
        await prisma.category.upsert({
          where: { slug: child.slug },
          update: {},
          create: {
            name: child.name,
            slug: child.slug,
            parentId: parent.id,
            sortOrder: i,
            isActive: true,
          },
        });
      }
    }
  }
  console.log('✅ Categories seeded');

  // Seed brands
  const brands = [
    { name: 'Apple', slug: 'apple' },
    { name: 'Samsung', slug: 'samsung' },
    { name: 'Sony', slug: 'sony' },
    { name: 'Microsoft', slug: 'microsoft' },
    { name: 'Google', slug: 'google' },
    { name: 'Xiaomi', slug: 'xiaomi' },
    { name: 'Tecno', slug: 'tecno' },
    { name: 'Infinix', slug: 'infinix' },
    { name: 'HP', slug: 'hp' },
    { name: 'Dell', slug: 'dell' },
    { name: 'Lenovo', slug: 'lenovo' },
    { name: 'Asus', slug: 'asus' },
    { name: 'Acer', slug: 'acer' },
    { name: 'JBL', slug: 'jbl' },
    { name: 'Anker', slug: 'anker' },
    { name: 'Logitech', slug: 'logitech' },
  ];

  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {},
      create: { name: brand.name, slug: brand.slug, isActive: true },
    });
  }
  console.log('✅ Brands seeded');

  // Default settings
  const settings = [
    { key: 'store_name', value: 'Bily Games and Gadget', group: 'general', isPublic: true },
    { key: 'store_email', value: 'support@bilygamesgadget.com', group: 'general', isPublic: true },
    { key: 'store_phone', value: '+234-800-000-0000', group: 'general', isPublic: true },
    { key: 'store_address', value: 'Lagos, Nigeria', group: 'general', isPublic: true },
    { key: 'currency', value: 'NGN', group: 'general', isPublic: true },
    { key: 'currency_symbol', value: '₦', group: 'general', isPublic: true },
    { key: 'shipping_fee', value: '2500', group: 'shipping', isPublic: true },
    { key: 'free_shipping_threshold', value: '50000', group: 'shipping', isPublic: true },
    { key: 'tax_rate', value: '0', group: 'tax', isPublic: true },
    { key: 'maintenance_mode', value: 'false', group: 'general', isPublic: false },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { ...setting },
    });
  }
  console.log('✅ Settings seeded');

  // Sample banners
  await prisma.banner.createMany({
    data: [
      {
        title: 'Latest Smartphones',
        subtitle: 'Discover the newest flagship phones from top brands',
        image: 'https://placehold.co/1920x600/1a1a2e/ffffff?text=Latest+Smartphones',
        link: '/products?category=smartphones',
        isActive: true,
        sortOrder: 0,
      },
      {
        title: 'Gaming Week Sale',
        subtitle: 'Up to 40% off on gaming consoles and accessories',
        image: 'https://placehold.co/1920x600/16213e/ffffff?text=Gaming+Week+Sale',
        link: '/products?category=gaming',
        badge: 'SALE',
        isActive: true,
        sortOrder: 1,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Banners seeded');

  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
