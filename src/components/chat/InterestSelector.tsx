'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, CardContent, Input } from '@/components/ui';

interface Interest {
  id: string;
  name: string;
  emoji: string;
  category: string;
}

interface InterestSelectorProps {
  selectedInterests: string[];
  onInterestsChange: (interests: string[]) => void;
  maxSelections?: number;
  showCategories?: boolean;
  disabled?: boolean;
}

const INTEREST_CATEGORIES = {
  entertainment: { name: 'Entertainment', emoji: '🎬' },
  hobbies: { name: 'Hobbies & Crafts', emoji: '🎨' },
  sports: { name: 'Sports & Fitness', emoji: '⚽' },
  technology: { name: 'Technology', emoji: '💻' },
  lifestyle: { name: 'Lifestyle', emoji: '✨' },
  education: { name: 'Learning', emoji: '📚' },
  travel: { name: 'Travel & Places', emoji: '✈️' },
  food: { name: 'Food & Cooking', emoji: '🍕' },
};

const POPULAR_INTERESTS: Interest[] = [
  // Entertainment
  { id: 'movies', name: 'Movies', emoji: '🎬', category: 'entertainment' },
  { id: 'music', name: 'Music', emoji: '🎵', category: 'entertainment' },
  { id: 'gaming', name: 'Gaming', emoji: '🎮', category: 'entertainment' },
  { id: 'books', name: 'Books', emoji: '📖', category: 'entertainment' },
  { id: 'tv-shows', name: 'TV Shows', emoji: '📺', category: 'entertainment' },
  { id: 'anime', name: 'Anime', emoji: '🍿', category: 'entertainment' },
  
  // Hobbies & Crafts
  { id: 'art', name: 'Art', emoji: '🎨', category: 'hobbies' },
  { id: 'photography', name: 'Photography', emoji: '📸', category: 'hobbies' },
  { id: 'writing', name: 'Writing', emoji: '✍️', category: 'hobbies' },
  { id: 'crafts', name: 'Crafts', emoji: '🧵', category: 'hobbies' },
  { id: 'gardening', name: 'Gardening', emoji: '🌱', category: 'hobbies' },
  
  // Sports & Fitness
  { id: 'fitness', name: 'Fitness', emoji: '💪', category: 'sports' },
  { id: 'yoga', name: 'Yoga', emoji: '🧘', category: 'sports' },
  { id: 'running', name: 'Running', emoji: '🏃', category: 'sports' },
  { id: 'football', name: 'Football', emoji: '⚽', category: 'sports' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀', category: 'sports' },
  
  // Technology
  { id: 'programming', name: 'Programming', emoji: '💻', category: 'technology' },
  { id: 'ai', name: 'AI & Tech', emoji: '🤖', category: 'technology' },
  { id: 'crypto', name: 'Cryptocurrency', emoji: '₿', category: 'technology' },
  
  // Lifestyle
  { id: 'fashion', name: 'Fashion', emoji: '👗', category: 'lifestyle' },
  { id: 'pets', name: 'Pets', emoji: '🐕', category: 'lifestyle' },
  { id: 'meditation', name: 'Meditation', emoji: '🧘‍♀️', category: 'lifestyle' },
  { id: 'self-improvement', name: 'Self Improvement', emoji: '📈', category: 'lifestyle' },
  
  // Education
  { id: 'science', name: 'Science', emoji: '🔬', category: 'education' },
  { id: 'history', name: 'History', emoji: '🏛️', category: 'education' },
  { id: 'languages', name: 'Languages', emoji: '🗣️', category: 'education' },
  
  // Travel
  { id: 'travel', name: 'Travel', emoji: '✈️', category: 'travel' },
  { id: 'culture', name: 'Culture', emoji: '🌍', category: 'travel' },
  
  // Food
  { id: 'cooking', name: 'Cooking', emoji: '👨‍🍳', category: 'food' },
  { id: 'food', name: 'Food', emoji: '🍕', category: 'food' },
];

export const InterestSelector = ({
  selectedInterests,
  onInterestsChange,
  maxSelections = 5,
  showCategories = true,
  disabled = false
}: InterestSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customInterest, setCustomInterest] = useState('');

  // Filter interests based on search and category
  const filteredInterests = POPULAR_INTERESTS.filter(interest => {
    const matchesSearch = interest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         interest.category.includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || interest.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleInterest = (interestId: string) => {
    if (disabled) return;

    if (selectedInterests.includes(interestId)) {
      onInterestsChange(selectedInterests.filter(id => id !== interestId));
    } else if (selectedInterests.length < maxSelections) {
      onInterestsChange([...selectedInterests, interestId]);
    }
  };

  const addCustomInterest = () => {
    const trimmed = customInterest.trim().toLowerCase();
    if (trimmed && !selectedInterests.includes(trimmed) && selectedInterests.length < maxSelections) {
      onInterestsChange([...selectedInterests, trimmed]);
      setCustomInterest('');
    }
  };

  const getSelectedInterestNames = () => {
    return selectedInterests.map(id => {
      const found = POPULAR_INTERESTS.find(interest => interest.id === id);
      return found ? found.name : id;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-cozy-brown-800 mb-2">
          What are you interested in?
        </h3>
        <p className="text-cozy-brown-600 text-sm">
          Select up to {maxSelections} interests to find people with similar passions
        </p>
      </div>

      {/* Selected Interests */}
      {selectedInterests.length > 0 && (
        <Card className="bg-cozy-orange-50 border-cozy-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-cozy-orange-800">Selected Interests</h4>
              <span className="text-sm text-cozy-orange-600">
                {selectedInterests.length} / {maxSelections}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedInterests.map((interestId, index) => {
                const interest = POPULAR_INTERESTS.find(i => i.id === interestId);
                return (
                  <motion.div
                    key={interestId}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-2 px-3 py-2 bg-cozy-orange-100 border border-cozy-orange-300 rounded-full text-sm"
                  >
                    <span>{interest?.emoji || '🏷️'}</span>
                    <span className="text-cozy-orange-800">
                      {interest?.name || interestId}
                    </span>
                    <button
                      onClick={() => toggleInterest(interestId)}
                      disabled={disabled}
                      className="text-cozy-orange-600 hover:text-cozy-orange-800 ml-1 disabled:opacity-50"
                    >
                      ×
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div>
        <Input
          placeholder="Search interests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
          className="w-full"
        />
      </div>

      {/* Categories */}
      {showCategories && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-2 rounded-full text-sm border transition-colors ${
              selectedCategory === null
                ? 'bg-cozy-orange-500 text-white border-cozy-orange-500'
                : 'bg-white text-cozy-brown-600 border-cozy-brown-200 hover:border-cozy-orange-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={disabled}
          >
            All
          </button>
          {Object.entries(INTEREST_CATEGORIES).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-2 rounded-full text-sm border transition-colors ${
                selectedCategory === key
                  ? 'bg-cozy-orange-500 text-white border-cozy-orange-500'
                  : 'bg-white text-cozy-brown-600 border-cozy-brown-200 hover:border-cozy-orange-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={disabled}
            >
              {category.emoji} {category.name}
            </button>
          ))}
        </div>
      )}

      {/* Interest Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <AnimatePresence>
          {filteredInterests.map((interest, index) => {
            const isSelected = selectedInterests.includes(interest.id);
            const isDisabled = disabled || (!isSelected && selectedInterests.length >= maxSelections);

            return (
              <motion.button
                key={interest.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.02 }}
                whileHover={!isDisabled ? { scale: 1.05 } : {}}
                whileTap={!isDisabled ? { scale: 0.95 } : {}}
                onClick={() => toggleInterest(interest.id)}
                disabled={isDisabled}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  isSelected
                    ? 'border-cozy-orange-400 bg-cozy-orange-50 text-cozy-orange-700'
                    : isDisabled
                    ? 'border-cozy-brown-100 bg-cozy-brown-50 text-cozy-brown-400 cursor-not-allowed'
                    : 'border-cozy-brown-200 bg-white text-cozy-brown-700 hover:border-cozy-orange-300 hover:bg-cozy-orange-50'
                }`}
              >
                <div className="text-2xl mb-2">{interest.emoji}</div>
                <div className="text-sm font-medium">{interest.name}</div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Custom Interest */}
      {selectedInterests.length < maxSelections && (
        <Card className="border-dashed border-cozy-brown-300">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add custom interest..."
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
                disabled={disabled}
                className="flex-1"
              />
              <Button
                onClick={addCustomInterest}
                disabled={disabled || !customInterest.trim()}
                variant="outline"
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-cozy-brown-500 mt-2">
              Can&apos;t find what you&apos;re looking for? Add your own interest!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
