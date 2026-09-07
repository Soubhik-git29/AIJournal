const fs = require('fs');
let content = fs.readFileSync('src/components/LocationPicker.tsx', 'utf8');

const replacement = `      const element = new placesLibrary.PlaceAutocompleteElement();
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
            name: place.displayName || place.name || 'Selected Location',
            address: place.formattedAddress || '',
            lat,
            lng
          });
          setIsOpen(false);
        } catch (err) {
          console.error("Error fetching place fields", err);
          // Fallback if fetchFields fails
          onLocationSelect({
            name: place.displayName || 'Unknown Location',
            address: '',
            lat: 0,
            lng: 0
          });
          setIsOpen(false);
        }
      });`;

const target = `      const element = new placesLibrary.PlaceAutocompleteElement();
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
      });`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/LocationPicker.tsx', content);
