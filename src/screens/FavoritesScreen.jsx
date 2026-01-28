import React from 'react';
import { ArrowLeft, Plus, Heart } from 'lucide-react';
import { MENU_ITEMS } from '../data';

const FavoritesScreen = ({
  favorites,
  onToggleFavorite,
  onItemClick,
  onBack,
}) => {
  // Filter the full menu to find items that match the favorite IDs
  const favoriteItems = MENU_ITEMS.filter((item) =>
    favorites.includes(item.id)
  );

  return (
    <div className="min-h-[100dvh] bg-gray-50 pb-32 font-opensans text-gray-900 relative">
      <style>{`
        .font-poppins { font-family: 'Poppins', sans-serif; }
        .font-opensans { font-family: 'Open Sans', sans-serif; }
      `}</style>

      {/* HEADER */}
      <div className="bg-[#013E37]/85 backdrop-blur-xl sticky top-0 z-30 shadow-lg border-b border-white/10 font-poppins">
        <div className="px-5 py-4 flex justify-between items-center">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 text-[#F4F3F2] transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <span className="font-bold text-xl text-[#F4F3F2]">My Favorites</span>
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-5 animate-fade-in">
        {favoriteItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
            <Heart size={64} className="mb-4 opacity-20" />
            <p className="font-poppins font-bold text-lg">No favorites yet</p>
            <p className="text-sm font-opensans">
              Tap the heart on items you love!
            </p>
            <button
              onClick={onBack}
              className="mt-6 text-[#013E37] font-bold text-sm bg-[#013E37]/10 px-6 py-3 rounded-xl hover:bg-[#013E37]/20 transition-colors"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {favoriteItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-[1.5rem] shadow-lg shadow-gray-200/50 flex flex-col hover:shadow-xl transition-all cursor-pointer group overflow-hidden relative"
                onClick={() => onItemClick(item)}
              >
                {/* Heart Button Overlay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(item.id);
                  }}
                  className="absolute top-3 right-3 z-10 transition-transform active:scale-90"
                >
                  <Heart
                    size={24}
                    className="text-[#013E37] fill-[#013E37] filter drop-shadow-md" // Always filled Forest Green in favorites tab
                  />
                </button>

                <div className="h-32 w-full overflow-hidden relative bg-gray-100">
                  <img
                    src={item.image}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    alt={item.name}
                  />
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-gray-900 leading-tight text-sm mb-1 line-clamp-2 font-poppins">
                    {item.name}
                  </h3>
                  <p className="text-[10px] text-gray-400 line-clamp-1 mb-3 font-opensans">
                    {item.description}
                  </p>

                  <div className="mt-auto flex justify-between items-center">
                    <span className="font-bold text-[#013E37] text-lg font-poppins">
                      ₱{item.price}
                    </span>
                    <button className="bg-gray-100 text-gray-900 p-2 rounded-full hover:bg-[#013E37] hover:text-white transition-colors shadow-sm">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesScreen;