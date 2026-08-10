# AI Restaurant Recommendation Agent for European Travellers

## Project Overview
This project is an AI-powered agent designed to recommend restaurants for travelers visiting European cities. It goes beyond a typical LLM chat by leveraging the LLM exclusively for reasoning, translation, and classification while grounding all factual information (location, restaurants, prices, menus, reviews) in verifiable real-world data from Google Places and official websites.

## Features
- **Strict Location Constraints**: Only provides recommendations for European cities.
- **Verified Sources**: Does not hallucinate restaurants, menus, or prices.
- **Contextual Review Search**: Semantically scores reviews based on user requirements (e.g. "child friendly").
- **Menu Extraction & Translation**: Scrapes menus from official websites, translating dishes while retaining the original name and price.
- **Dietary Analysis**: Classifies dishes as Vegan/Vegetarian based on available data.
- **Clear Sourcing**: Every recommendation item explicitly states its source or notes if unverified.

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, Axios.
- **Backend**: Node.js, Express, Mongoose.
- **External Services**:
  - Google Gemini API (via `@google/genai`) for reasoning/translation.
  - Google Maps/Places API for verified locations and reviews.
  - Tavily API for web research and website/menu discovery.

## Environment Variables
Create a `.env` file in the `server` directory with the following keys:
```
GEMINI_API_KEY=your_gemini_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
TAVILY_API_KEY=your_tavily_key_here
MONGODB_URI=your_mongodb_uri_here
PORT=5000
```
*(See `.env.example`)*

## Installation & Running

1. **Install Backend Dependencies**:
   ```bash
   cd server
   npm install
   ```
2. **Install Frontend Dependencies**:
   ```bash
   cd client
   npm install
   ```
3. **Start the Backend** (from `server` directory):
   ```bash
   node src/index.js
   ```
4. **Start the Frontend** (from `client` directory):
   ```bash
   npm run dev
   ```

## Architecture & Data Flow
1. **Query Parsing**: Gemini parses the user's natural language request into a strict JSON schema.
2. **Discovery**: Google Places API is queried for the location and relevant restaurants.
3. **Ranking**: Results are hard-filtered (must be in Europe) and sorted.
4. **Deep Research**: Tavily finds official websites. Menus are scraped (Cheerio) and parsed.
5. **Contextual Reviews**: Gemini analyzes Google Reviews for the user's specific context.
6. **Recommendation Synthesis**: A final grounded JSON payload is sent to the UI.

## Anti-Hallucination Strategy
- The system never asks the LLM "What is a good restaurant?". It asks "Given this list of verified restaurants from Google Places, and these extracted menus, which is the best fit?".
- All prices, URLs, and addresses are strictly mapped from external API sources, bypassing LLM generation.
