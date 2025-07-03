document.addEventListener('DOMContentLoaded', () => {
    const hyderabad_coords = [17.3850, 78.4867];
    const map = L.map('map').setView(hyderabad_coords, 12);
    let userMarker;
    let radiusCircle;
    let restaurantMarkers = [];
    let allRestaurants = [];
    let activeCuisine = null;

    const orangeIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const search = new GeoSearch.GeoSearchControl({
        provider: new GeoSearch.OpenStreetMapProvider(),
        style: 'bar',
        showMarker: false, 
        autoClose: true,
    });
    map.addControl(search);

    map.on('geosearch/showlocation', function(result) {
        const { x, y } = result.location; // x is lon, y is lat
        updateMarkerAndFetch([y, x]);
    });

    map.on('click', function(e) {
        updateMarkerAndFetch(e.latlng);
    });

    function updateMarkerAndFetch(latlng) {
        const { lat, lng } = L.latLng(latlng);
        if (userMarker) {
            userMarker.setLatLng([lat, lng]);
        } else {
            userMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
            userMarker.on('dragend', function(event) {
                const marker = event.target;
                const position = marker.getLatLng();
                fetchRestaurants(position.lat, position.lng);
            });
        }
        map.setView([lat, lng], 13);

        // Add or update the 2km radius circle
        const radius = 2000; // 2km in meters
        if (radiusCircle) {
            radiusCircle.setLatLng([lat, lng]);
        } else {
            radiusCircle = L.circle([lat, lng], {
                radius: radius,
                color: '#87CEEB',
                fillColor: '#87CEEB',
                fillOpacity: 0.2,
                weight: 2 
            }).addTo(map);
        }

        map.fitBounds(radiusCircle.getBounds());
        fetchRestaurants(lat, lng);
    }

    function clearResults() {
        document.getElementById('restaurant-list').innerHTML = '<p class="placeholder">Loading restaurants...</p>';
        document.getElementById('cuisine-buttons').innerHTML = '';
        document.getElementById('bestseller-list').innerHTML = '';
        restaurantMarkers.forEach(marker => marker.remove());
        restaurantMarkers = [];
    }

    async function fetchRestaurants(lat, lon) {
        clearResults();
        try {
            const response = await fetch(`/api/restaurants?lat=${lat}&lon=${lon}`);
            const data = await response.json();
            allRestaurants = data.restaurants || [];
            displayCuisines(data.popular_cuisines || []);
            displayBestSellers(data.popular_best_sellers || []);
            displayRestaurants(allRestaurants);
        } catch (error) {
            console.error('Error fetching restaurants:', error);
            document.getElementById('restaurant-list').innerHTML = '<p class="placeholder">Could not fetch restaurants. Please try again.</p>';
        }
    }

    function displayRestaurants(restaurants) {
        const restaurantList = document.getElementById('restaurant-list');
        restaurantList.innerHTML = '';
        
        // Clear previous restaurant markers
        restaurantMarkers.forEach(marker => marker.remove());
        restaurantMarkers = [];

        if (restaurants.length === 0) {
            restaurantList.innerHTML = '<p class="placeholder">No restaurants found in this area.</p>';
            return;
        }

        const filteredRestaurants = activeCuisine 
            ? restaurants.filter(r => r.cuisines && r.cuisines.includes(activeCuisine))
            : restaurants;

        if (filteredRestaurants.length === 0) {
            restaurantList.innerHTML = `<p class="placeholder">No restaurants found for the cuisine: ${activeCuisine}.</p>`;
        }

        filteredRestaurants.forEach(res => {
            const card = document.createElement('div');
            card.className = 'restaurant-card';
            card.innerHTML = `
                <h3>${res.name}</h3>
                <p><span class="rating">★ ${res.rating || 'N/A'}</span> (${res.number_of_ratings})</p>
                <p><strong>Cuisines:</strong> ${res.cuisines || 'N/A'}</p>
                <p><strong>Location:</strong> ${res.location}</p>
                <p>~${res.distance_km.toFixed(2)} km away</p>
                <div class="restaurant-details" style="display: none;"></div>
            `;
            
            card.addEventListener('click', () => {
                // Close any other expanded card
                const currentlyExpanded = document.querySelector('.restaurant-card.expanded');
                if (currentlyExpanded && currentlyExpanded !== card) {
                    currentlyExpanded.classList.remove('expanded');
                    const otherDetails = currentlyExpanded.querySelector('.restaurant-details');
                    if (otherDetails) {
                        otherDetails.style.display = 'none';
                        otherDetails.innerHTML = '';
                    }
                }

                // Toggle current card
                card.classList.toggle('expanded');
                const detailsContainer = card.querySelector('.restaurant-details');
                
                if (detailsContainer && card.classList.contains('expanded')) {
                    detailsContainer.style.display = 'block';
                    
                    let bestSellersHtml = '<h4>Best-Selling Items:</h4>';
                    try {
                        const bestSellers = JSON.parse(res.best_sellers);
                        if (bestSellers && bestSellers.length > 0) {
                            bestSellersHtml += '<ul>';
                            bestSellers.forEach(item => {
                                bestSellersHtml += `<li>${item.name} ${item.rating && item.rating !== 'N/A' ? `(★ ${item.rating})` : ''}</li>`;
                            });
                            bestSellersHtml += '</ul>';
                        } else {
                            bestSellersHtml += '<p>No best-sellers listed.</p>';
                        }
                    } catch (e) {
                        bestSellersHtml += '<p>No best-seller information available.</p>';
                    }

                    detailsContainer.innerHTML = `
                        <p><strong>Address:</strong> ${res.address || 'N/A'}</p>
                        <p><strong>Cost for Two:</strong> ${res.cost_for_two || 'N/A'}</p>
                        ${bestSellersHtml}
                    `;
                } else if (detailsContainer) {
                    detailsContainer.style.display = 'none';
                    detailsContainer.innerHTML = '';
                }
            });

            restaurantList.appendChild(card);

            // Add marker to map
            if (res.latitude && res.longitude) {
                const marker = L.marker([res.latitude, res.longitude], { icon: orangeIcon }).addTo(map)
                    .bindPopup(`<b>${res.name}</b><br>${res.location}`);
                restaurantMarkers.push(marker);

                card.addEventListener('mouseenter', () => marker.openPopup());
                card.addEventListener('mouseleave', () => marker.closePopup());
            }
        });
    }

    function displayCuisines(cuisines) {
        const cuisineButtons = document.getElementById('cuisine-buttons');
        cuisineButtons.innerHTML = '';
        
        const allBtn = document.createElement('button');
        allBtn.className = 'cuisine-btn';
        allBtn.innerText = 'All';
        allBtn.onclick = () => {
            activeCuisine = null;
            document.querySelectorAll('.cuisine-btn').forEach(btn => btn.classList.remove('active'));
            allBtn.classList.add('active');
            displayRestaurants(allRestaurants);
        };
        cuisineButtons.appendChild(allBtn);

        cuisines.forEach(cuisine => {
            const btn = document.createElement('button');
            btn.className = 'cuisine-btn';
            btn.innerText = cuisine;
            btn.onclick = () => {
                activeCuisine = cuisine;
                document.querySelectorAll('.cuisine-btn').forEach(btn => btn.classList.remove('active'));
                btn.classList.add('active');
                displayRestaurants(allRestaurants);
            };
            cuisineButtons.appendChild(btn);
        });
        
        // Set 'All' as active by default
        if (cuisineButtons.firstChild) {
            cuisineButtons.firstChild.classList.add('active');
        }
    }

    function displayBestSellers(bestsellers) {
        const bestsellerList = document.getElementById('bestseller-list');
        bestsellerList.innerHTML = '';
        if (bestsellers.length === 0) {
            bestsellerList.innerHTML = '<p class="placeholder">No best-seller data for this area.</p>';
            return;
        }
        const ul = document.createElement('ul');
        bestsellers.forEach(item => {
            const li = document.createElement('li');
            li.innerText = item;
            ul.appendChild(li);
        });
        bestsellerList.appendChild(ul);
    }
}); 