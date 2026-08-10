import React from 'react';
import { MapPin, Star, Link as LinkIcon, UtensilsCrossed, CheckCircle2, ShieldCheck, AlertCircle, MessageSquare } from 'lucide-react';

export default function RestaurantCard({ data }) {
  const { name, rating, reviewCount, priceLevel, address, mapsUrl, whyRecommended, officialWebsiteUrl, menuUrl, menuItems, reviewInsights } = data;

  // Render price level as € symbols
  const renderPriceLevel = (level) => {
    if (level === 'PRICE_LEVEL_FREE') return '€0';
    if (level === 'PRICE_LEVEL_INEXPENSIVE') return '€';
    if (level === 'PRICE_LEVEL_MODERATE') return '€€';
    if (level === 'PRICE_LEVEL_EXPENSIVE') return '€€€';
    if (level === 'PRICE_LEVEL_VERY_EXPENSIVE') return '€€€€';
    return '';
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6 md:p-8">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
            <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
              <span className="flex items-center text-yellow-500">
                <Star className="w-4 h-4 fill-current mr-1" />
                {rating} ({reviewCount})
              </span>
              <span>•</span>
              <span className="font-semibold">{renderPriceLevel(priceLevel)}</span>
              <span>•</span>
              <span className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                <MapPin className="w-4 h-4" />
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  {address}
                </a>
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 shrink-0">
            {officialWebsiteUrl?.verified ? (
              <a href={officialWebsiteUrl.url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors text-sm">
                <LinkIcon className="w-4 h-4" /> Official Website
              </a>
            ) : (
              <span className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium text-sm border border-red-100">
                <AlertCircle className="w-4 h-4" /> Website Not Verified
              </span>
            )}
            
            {menuUrl?.verified ? (
              <a href={menuUrl.url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors text-sm">
                <UtensilsCrossed className="w-4 h-4" /> View Full Menu
              </a>
            ) : null}
          </div>
        </div>

        <div className="my-6 h-px bg-gray-100 w-full" />

        {/* Why Recommended AI insight */}
        <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 mb-6">
          <h4 className="flex items-center gap-2 text-sm font-bold text-blue-900 mb-2 uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-blue-600" /> Why it matches
          </h4>
          <p className="text-gray-700 leading-relaxed">{whyRecommended}</p>
        </div>

        {/* Two-column layout for Menu & Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Menu Highlights */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2 uppercase tracking-wider">
              MENU
            </h4>
            <div className="w-full border-t border-gray-300"></div>

            {data.menuStatus === 'verified' && menuItems && menuItems.length > 0 ? (
              <>
                <ul className="space-y-4 my-4">
                  {menuItems.slice(0, 5).map((item, idx) => (
                    <li key={idx} className="flex flex-col">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-gray-900">{item.translatedName || item.originalName}</span>
                        <span className="font-medium text-gray-900 whitespace-nowrap ml-2">
                          {item.priceVerified !== false && item.price !== null ? `${item.price} ${item.currency || 'EUR'}` : <span className="text-gray-400 text-sm italic">Unverified</span>}
                        </span>
                      </div>

                      {item.translatedDescription && (
                        <div className="text-sm text-gray-600 mt-0.5">{item.translatedDescription}</div>
                      )}


                      <div className="flex gap-2 mt-1.5">
                        {item.vegan && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700">✓ Vegan</span>
                        )}
                        {item.vegetarian && !item.vegan && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">✓ Vegetarian</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="w-full border-t border-gray-300 mb-4"></div>
                
                {menuUrl?.verified && (
                  <a href={menuUrl.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-800 uppercase">
                    [View Full Menu]
                  </a>
                )}
                <div className="mt-4 text-xs text-gray-500">
                  <span className="block font-semibold">Source:</span>
                  Official restaurant menu ({data.sourceType || 'html'})
                </div>
              </>
            ) : (
              <>
                <div className="py-4 text-sm text-gray-600 italic">
                  {data.menuStatus === 'blocked' ? 'Menu access was blocked by the restaurant website.' : 'Menu could not be verified from an accessible source.'}
                </div>
                
                {officialWebsiteUrl?.verified && (
                  <a href={officialWebsiteUrl.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-800 uppercase">
                    [Open Restaurant Website]
                  </a>
                )}
                <div className="w-full border-t border-gray-300 mt-4"></div>
              </>
            )}
          </div>

          {/* Contextual Reviews */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              Review Insights
            </h4>
            
            {reviewInsights ? (
              <div className="space-y-4">
                {/* Contextual match */}
                {reviewInsights.contextualInsights?.length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <h5 className="text-purple-900 font-semibold text-sm mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> Relevant to your request
                    </h5>
                    <ul className="list-disc pl-5 text-sm text-purple-800 space-y-1">
                      {reviewInsights.contextualInsights.map((insight, idx) => (
                        <li key={idx}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Positives */}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <h5 className="text-green-900 font-semibold text-sm mb-2">What people love</h5>
                    <ul className="list-disc pl-5 text-sm text-green-800 space-y-1">
                      {reviewInsights.positiveInsights?.slice(0,2).map((insight, idx) => (
                        <li key={idx}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Negatives */}
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                    <h5 className="text-red-900 font-semibold text-sm mb-2">Common complaints</h5>
                    <ul className="list-disc pl-5 text-sm text-red-800 space-y-1">
                      {reviewInsights.negativeInsights?.slice(0,2).map((insight, idx) => (
                        <li key={idx}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg border border-gray-100">
                Not enough review data available to generate insights.
              </div>
            )}
          </div>
          
        </div>

        {/* Trust UI / Sources footer */}
        <div className="mt-8 pt-4 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-2 items-center text-xs text-gray-500">
          <span className="flex items-center gap-1 font-medium uppercase tracking-wider text-gray-400">
            <ShieldCheck className="w-4 h-4" /> Data Sources
          </span>
          <span className="flex items-center gap-1">
            <strong>Location & Reviews:</strong> Google Places API
          </span>
          <span className="flex items-center gap-1">
            <strong>Website:</strong> {officialWebsiteUrl?.verified ? officialWebsiteUrl.source : 'Not Verified'}
          </span>
          <span className="flex items-center gap-1">
            <strong>Menu & Prices:</strong> {menuUrl?.verified ? menuUrl.source : 'Not Verified'}
          </span>
        </div>

      </div>
    </div>
  );
}
