const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');
const Product = require('./models/Product');
const User = require('./models/User');

dotenv.config();

const categories = [
    {
        name: 'Resin Jewelry',
        slug: 'resin-jewelry',
        description: 'Beautifully handcrafted pendants, earrings, and rings made with high-quality resin and organic embeds.',
        image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80',
        banner: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1600&q=80',
        itemCount: 45
    },
    {
        name: 'Home Décor',
        slug: 'home-decor',
        description: 'Transform your living space with our unique resin coasters, trays, and wall art.',
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
        banner: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1600&q=80',
        itemCount: 32
    },
    {
        name: 'Custom Gifts',
        slug: 'custom-gifts',
        description: 'Personalized resin art pieces perfect for birthdays, weddings, and special occasions.',
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
        banner: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1600&q=80',
        itemCount: 28
    },
    {
        name: 'Accessories',
        slug: 'accessories',
        description: 'From keychains to bookmarks, find the perfect small art piece for your daily life.',
        image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80',
        banner: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1600&q=80',
        itemCount: 15
    }
];

const products = [
    {
        name: 'Ocean Wave Resin Pendant',
        slug: 'ocean-wave-resin-pendant',
        price: 1299,
        originalPrice: 1599,
        categorySlug: 'resin-jewelry',
        description: 'A stunning ocean-inspired pendant handcrafted with multiple layers of ocean-blue resin and real white sand. Each piece captures a unique wave pattern, making it a one-of-a-kind wearable art piece.',
        shortDescription: 'Handcrafted ocean-inspired resin pendant with real sand.',
        images: [
            'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80',
            'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80'
        ],
        rating: 4.8,
        reviewsCount: 124,
        stock: 15,
        isNewArrival: true,
        isBestSeller: true,
        isCustomizable: true,
        tags: ['necklace', 'blue', 'ocean', 'jewelry']
    },
    {
        name: 'Gold Flake Geode Coasters (Set of 4)',
        slug: 'gold-flake-geode-coasters',
        price: 899,
        originalPrice: 1200,
        categorySlug: 'home-decor',
        description: 'Elegant set of 4 geode-inspired coasters with metallic gold leaf flakes and a deep emerald center. These coasters are heat resistant and add a touch of luxury to your coffee table.',
        shortDescription: 'Luxury geode coasters with 24k style gold flakes.',
        images: [
            'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
            'https://images.unsplash.com/photo-1517519014137-526466372052?w=800&q=80'
        ],
        rating: 4.9,
        reviewsCount: 86,
        stock: 20,
        isNew: false,
        isBestSeller: true,
        isCustomizable: false,
        tags: ['home', 'dining', 'coaster', 'gold']
    },
    {
        name: 'Dried Flower Resin Bookmark',
        slug: 'dried-flower-resin-bookmark',
        price: 249,
        originalPrice: 350,
        categorySlug: 'accessories',
        description: 'Preserve the beauty of nature with our dried flower bookmarks. Real pressed flowers are encased in crystal clear resin, finished with a matching silk tassel.',
        shortDescription: 'Handmade bookmark with real pressed flowers.',
        images: [
            'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
            'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80'
        ],
        rating: 4.7,
        reviewsCount: 215,
        stock: 50,
        isNew: false,
        isBestSeller: true,
        isCustomizable: true,
        tags: ['books', 'flower', 'gift', 'nature']
    },
    {
        name: 'Cosmic Nebula Keychain',
        slug: 'cosmic-nebula-keychain',
        price: 199,
        originalPrice: 299,
        categorySlug: 'accessories',
        description: 'Carry a piece of the universe with you. This alphabet keychain features a mesmerizing nebula effect with holographic glitters and deep space colors.',
        shortDescription: 'Personalized cosmic nebula effect keychain.',
        images: [
            'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80'
        ],
        rating: 4.6,
        reviewsCount: 42,
        stock: 100,
        isNewArrival: true,
        isBestSeller: false,
        isCustomizable: true,
        tags: ['personal', 'keychain', 'space', 'galaxy']
    }
];

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB for seeding...');

        // Clear existing data
        await Category.deleteMany();
        await Product.deleteMany();
        await User.deleteMany({ role: 'user' }); // Keep admin

        console.log('🧹 Cleared existing data...');

        // Seed Categories
        const createdCategories = await Category.insertMany(categories);
        console.log(`📂 Created ${createdCategories.length} categories`);

        // Add category IDs to products
        const productsWithIds = products.map(product => {
            const category = createdCategories.find(c => c.slug === product.categorySlug);
            return {
                ...product,
                category: category._id
            };
        });

        // Seed Products
        const createdProducts = await Product.insertMany(productsWithIds);
        console.log(`🎨 Created ${createdProducts.length} products`);

        console.log('✨ Database seeded successfully!');
        process.exit();
    } catch (error) {
        console.error('❌ Seeding error:', error.message);
        process.exit(1);
    }
};

seedData();
