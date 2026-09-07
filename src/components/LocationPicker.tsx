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
    
    if (autocompleteElementRef.current) {
      containerRef.current.appendChild(autocompleteElementRef.current);
    } else {
      const element = new placesLibrary.PlaceAutocompleteElement();
      element.id = 'location-picker';
      
      element.addEventListener('gmp-placeselect', async (e: any) => {
        const place = e.place;
        if (!place) {
          onLocationSelect(null);
          setIsOpen(false);
          return;
        }
        
        try {
          await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
          let lat = 0;
          let lng = 0;
          if (place.location) {
             if (typeof place.location.lat === 'function') {
                lat = place.location.lat();
                lng = place.location.lng();
             } else {
                lat = place.location.lat || 0;
                lng = place.location.lng || 0;
             }
          }
          
          onLocationSelect({
            name: place.displayName || place.name || 'Unknown Location',
            address: place.formattedAddress || '',
            lat,
            lng
          });
          // Reset the input so dropdown closes
          element.value = '';
          element.blur && element.blur();
          
          // Manually clean up any orphaned pac-containers just in case
          setTimeout(() => {
             document.querySelectorAll('.pac-container').forEach(el => el.remove());
          }, 100);

          setIsOpen(false);
        } catch (err) {
          console.error("Error fetching place fields", err);
          onLocationSelect({
            name: place.displayName || place.name || 'Unknown Location',
            address: '',
            lat: 0,
            lng: 0
          });
          // Reset the input so dropdown closes
          element.value = '';
          element.blur && element.blur();

          setTimeout(() => {
             document.querySelectorAll('.pac-container').forEach(el => el.remove());
          }, 100);

          setIsOpen(false);
        }
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
      <button type="button" onClick={() => {
        if (autocompleteElementRef.current) {
           autocompleteElementRef.current.value = '';
        }
        setTimeout(() => {
           document.querySelectorAll('.pac-container').forEach(el => el.remove());
        }, 100);
        setIsOpen(false);
      }} className="absolute right-2 top-2 p-1 bg-white rounded-full text-neutral-500 hover:text-red-500 z-10">
        <X size={16} />
      </button>
    </div>
  );
}
