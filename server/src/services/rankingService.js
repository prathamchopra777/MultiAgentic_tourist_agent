class RankingService {
  static rankAndFilter(places, requirements) {
    console.log(`\nRankingService - Ranking ${places.length} places...`);
    
    // Hard Filtering
    let filtered = places.filter(place => {
      if (place.businessStatus !== 'OPERATIONAL' && place.businessStatus) {
        console.log(`- Filtered out ${place.name} (Not operational)`);
        return false;
      }
      
      // Trust Google Places to return relevant locations based on the search query.
      // Removed rigid string matching for city/country because it fails on abbreviations (e.g. "UK" vs "United Kingdom").
      
      return true;
    });

    console.log(`RankingService - ${filtered.length} places remaining after hard filtering`);

    // Basic Scoring (will be enhanced with reviews/menus later)
    filtered = filtered.map(place => {
      let score = 0;
      
      // Rating (0-5, weighted 10) -> max 50
      score += place.rating * 10;
      
      // Review Count (boost up to 20 for popularity)
      score += Math.min(place.reviewCount / 100, 20);

      // Add a small random factor to prevent always picking the exact same places
      // and simulate slight preference variations
      score += Math.random() * 5;

      return {
        ...place,
        score
      };
    });

    // Sort descending by score
    filtered.sort((a, b) => b.score - a.score);

    const top10 = filtered.slice(0, 10);
    console.log(`RankingService - Top 10 places selected:`, top10.map(p => `${p.name} (Score: ${p.score.toFixed(1)})`));

    return top10;
  }
}

module.exports = RankingService;
