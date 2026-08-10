const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema({
  placeId: { type: String, required: true, unique: true, sparse: true },
  name: { type: String, required: true },
  address: String,
  latitude: Number,
  longitude: Number,
  rating: Number,
  reviewCount: Number,
  priceLevel: String,
  websiteUrl: String,
  mapsUrl: String,
  businessStatus: String,
  
  // Enriched Data
  officialWebsiteUrl: {
    url: String,
    source: String,
    verified: Boolean
  },
  menuUrl: {
    url: String,
    source: String,
    verified: Boolean
  },
  menuStatus: String,
  sourceType: String,
  menuItems: [mongoose.Schema.Types.Mixed],
  reviewInsights: mongoose.Schema.Types.Mixed,
  
  // Caching mechanism
  lastUpdated: { type: Date, default: Date.now, expires: 86400 } // TTL 24 hours
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);
