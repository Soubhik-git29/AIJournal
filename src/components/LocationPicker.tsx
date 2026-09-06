import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, X } from 'lucide-react';
import { LocationData } from '../types';

interface LocationPickerProps {
  onLocationSelect: (location: LocationData | null) => void;
  selectedLocation: LocationData | null;
}

export function LocationPicker({ onLocationSelect, selectedLocation }: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const placesLibrary = useMapsLibrary('places');
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteElementRef = useRef<any>(null);

  useEffect(() => {
    if (!placesLibrary || !isOpen || !containerRef.current) return;
    
    if (!autocompleteElementRef.current) {
      // Create the element imperatively
      const element = new placesLibrary.PlaceAutocompleteElement();
      element.id = 'location-picker';
      
      // Wait, is it PlaceAutocompleteElement? Let's check documentation via rpc if unsure, but the skill says:
      // "PlaceAutocompleteElement (<gmp-place-autocomplete>): Drop-in web component."
      
      element.addEventListener('gmp-placeselect', (e: any) => {
        const place = e.place;
        if (!place) {
          onLocationSelect(null);
          setIsOpen(false);
          return;
        }
        
        // We need to fetch fields if not populated
        place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] }).then(() => {
          onLocationSelect({
            name: place.displayName || '',
            address: place.formattedAddress || '',
            lat: place.location?.lat() || 0,
            lng: place.location?.lng() || 0
          });
          setIsOpen(false);
        }).catch((err: any) => {
          console.error("Error fetching place fields", err);
        });
      });
      
      autocompleteElementRef.current = element;
      containerRef.current.appendChild(element);
    }
  }, [placesLibrary, isOpen, onLocationSelect]);

  if (!isOpen && selectedLocation) {
    return (
      <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl px-3 py-1.5 max-w-[200px]">
        <MapPin size={14} className="text-blue-500 flex-shrink-0" />
        <span className="text-xs truncate font-medium">{selectedLocation.name}</span>
        <button type="button" onClick={() => onLocationSelect(null)} className="text-neutral-500 hover:text-red-500 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-2.5 rounded-xl transition-colors flex-shrink-0 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200"
        title="Add Location"
      >
        <MapPin size={16} />
      </button>
    );
  }

  return (
    <div className="relative flex items-center">
      <div ref={containerRef} className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-800 p-1 min-w-[250px]" />
      <button type="button" onClick={() => setIsOpen(false)} className="absolute right-2 top-2 p-1 bg-white rounded-full text-neutral-500 hover:text-red-500 z-10">
        <X size={16} />
      </button>
    </div>
  );
}
