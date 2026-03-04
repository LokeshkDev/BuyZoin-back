const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    type: {
        type: String,
        default: 'homepage',
        unique: true
    },
    hero: {
        title: { type: String, default: 'Beautiful Resin Art for Your Home' },
        subtitle: { type: String, default: 'Unique and handcrafted resin items made with love to make your home look special.' },
        banner: { type: String, default: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200&q=80' },
        primaryBtnText: { type: String, default: 'Go to Shop' },
        secondaryBtnText: { type: String, default: 'Custom Orders' }
    },
    widgets: {
        showBestSellers: { type: Boolean, default: true },
        showNewArrivals: { type: Boolean, default: true },
        showCategories: { type: Boolean, default: true },
        showNewsletter: { type: Boolean, default: true },
        showGallery: { type: Boolean, default: true }
    },
    announcement: {
        text: { type: String, default: '✨ Free shipping on orders above ₹999 | Use code SAVE10 for 10% off' },
        isActive: { type: Boolean, default: true }
    },
    bespoke: {
        title: { type: String, default: 'Made Just for You' },
        subtitle: { type: String, default: 'Tell us your ideas and we will make a special resin piece that matches your style and choice.' },
        image: { type: String, default: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&q=80&w=2000' },
        video: { type: String, default: '' }
    },
    artisanWorkflow: {
        sectionLabel: { type: String, default: 'Scientific Excellence' },
        sectionTitle: { type: String, default: 'The Artisan Workflow.' },
        steps: [{
            step: { type: String },
            title: { type: String },
            desc: { type: String }
        }]
    },
    newsletter: {
        title: { type: String, default: 'Stay Updated' },
        subtitle: { type: String, default: 'Sign up to get the latest designs, special offers, and news about our store.' },
        image: { type: String, default: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=2000' }
    },
    about: {
        title: { type: String, default: 'About BuyZoin' },
        subtitle: { type: String, default: 'Our journey of making beautiful resin art for every Indian home.' },
        banner: { type: String, default: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80' },
        content: { type: String, default: 'We make every piece by hand using high-quality resin and colors. Our goal is to create art that looks great and lasts a long time.' },
        image1: { type: String, default: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=800&q=80' },
        legacyStatsValue: { type: String, default: '5000+' },
        legacyStatsLabel: { type: String, default: 'Happy Customers' },
        legacyFeature1Title: { type: String, default: 'Safe Materials' },
        legacyFeature1Desc: { type: String, default: 'We use non-toxic and high-quality resin.' },
        legacyFeature2Title: { type: String, default: '100% Homemade' },
        legacyFeature2Desc: { type: String, default: 'Every piece is handmade with complete care.' },
        vision: { type: String, default: 'Our vision is to make handmade resin art popular in every home across India.' },
        mission: { type: String, default: 'We want to provide the best quality handcrafted art at a fair price.' }
    },
    contact: {
        title: { type: String, default: 'Get in Touch' },
        subtitle: { type: String, default: 'Have a question? We are always here to help you out.' },
        banner: { type: String, default: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=1200' },
        email: { type: String, default: 'hello@buyzoin.com' },
        phone: { type: String, default: '+91 98765 43210' },
        whatsapp: { type: String, default: '+91 98765 43210' },
        mobile: { type: String, default: '+91 98765 43210' },
        address: { type: String, default: 'Studio No. 42, Creative Area, Mumbai, Maharashtra.' },
        gstin: { type: String, default: '' },
        studioTitle: { type: String, default: 'Visit Our Workspace' },
        studioDescription: { type: String, default: 'Come and see how we make our resin pieces. You can visit us and pick up your favorite items.' },
        studioImage: { type: String, default: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80' }
    },
    social: {
        instagram: { type: String, default: 'https://instagram.com' },
        whatsapp: { type: String, default: 'https://wa.me' },
        facebook: { type: String, default: 'https://facebook.com' },
        twitter: { type: String, default: 'https://twitter.com' },
        pinterest: { type: String, default: 'https://pinterest.com' }
    },
    headerBanner: {
        text: { type: String, default: 'Check out our new resin collection for 2026!' },
        image: { type: String, default: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200' },
        isActive: { type: Boolean, default: false }
    }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
