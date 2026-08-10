const axios = require('axios');

class GooglePlacesService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
    this.baseUrl = 'https://places.googleapis.com/v1/places:searchText';
  }

  async searchRestaurants(requirements) {
    console.log(`\nGooglePlacesService.searchRestaurants - Searching for restaurants near: ${requirements.area ? requirements.area + ', ' : ''}${requirements.city}, ${requirements.country}`);
    try {
      let queryParts = [];
      if (requirements.diet && requirements.diet.length > 0) {
        const cleanedDiet = requirements.diet.filter(d => d.toLowerCase() !== 'non-vegetarian' && d.toLowerCase() !== 'non vegetarian');
        if (cleanedDiet.length > 0) {
          queryParts.push(cleanedDiet.join(' '));
        }
      }
      if (requirements.cuisine && requirements.cuisine.length > 0) {
        queryParts.push(requirements.cuisine.join(' '));
      }
      if (requirements.meal) {
        queryParts.push(requirements.meal);
      }
      
      queryParts.push('restaurants');
      const searchTopic = queryParts.join(' ');
      const location = `${requirements.area ? requirements.area + ', ' : ''}${requirements.city}, ${requirements.country}`;
      const textQuery = `${searchTopic} in ${location}`;
      
      const payload = {
        textQuery,
        languageCode: "en"
      };

      console.log('GooglePlacesService.searchRestaurants - Payload:', payload);

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.websiteUri,places.googleMapsUri,places.businessStatus'
        }
      });

      const places = response.data.places || [];
      console.log(`GooglePlacesService.searchRestaurants - Found ${places.length} places`);

      const normalizedPlaces = places.map(place => this.normalizePlace(place));
      
      // Deduplication
      const uniquePlaces = [];
      const seenIds = new Set();
      const seenNameAddress = new Set();
      
      for (const place of normalizedPlaces) {
          if (seenIds.has(place.placeId)) continue;
          
          const nameAddressKey = (place.name + '_' + place.address).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (seenNameAddress.has(nameAddressKey)) continue;
          
          seenIds.add(place.placeId);
          seenNameAddress.add(nameAddressKey);
          uniquePlaces.push(place);
      }
      
      console.log(`GooglePlacesService.searchRestaurants - Returning ${uniquePlaces.length} unique places`);
      return uniquePlaces;
    } catch (error) {
      console.error('GooglePlacesService.searchRestaurants - Error:', error?.response?.data || error.message);
      throw error;
    }
  }

  normalizePlace(place) {
    return {
      placeId: place.id,
      name: place.displayName?.text || 'Unknown',
      address: place.formattedAddress,
      latitude: place.location?.latitude || 0,
      longitude: place.location?.longitude || 0,
      rating: place.rating || 0,
      reviewCount: place.userRatingCount || 0,
      priceLevel: place.priceLevel || 'PRICE_LEVEL_UNSPECIFIED',
      websiteUrl: place.websiteUri || null,
      mapsUrl: place.googleMapsUri || null,
      businessStatus: place.businessStatus
    };
  }

  async getPlaceDetails(placeId) {
    console.log(`\nGooglePlacesService.getPlaceDetails - Fetching details for: ${placeId}`);
    try {
      const response = await axios.get(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'reviews,websiteUri'
        }
      });
      return response.data;
    } catch (error) {
      console.error('GooglePlacesService.getPlaceDetails - Error:', error?.response?.data || error.message);
      return {};
    }
  }
}

module.exports = new GooglePlacesService();
