/* eslint-disable */
export const displayMap = (locations) => {
	mapboxgl.accessToken =
		'pk.eyJ1Ijoia2VyaW1mIiwiYSI6ImNrOW82c2gyMTA1dHYzbmw5cHFvYWxubTUifQ.rJ1Bglrzz-5IXU3e_oC1TA';

	var map = new mapboxgl.Map({
		// this will put a map on the element of map
		container: 'map',
		style: 'mapbox://styles/kerimf/ck9o6vi6315cy1ilewub2wz6t',
		scrollZoom: false
		// we can specify the center of the map, so where the map is focussed
		// center: [-118.113491, 34.111745],
		// zoom: 10,
		// interactive: false
	});

	// We want to put all the locations for a certain tour on the map, and allow the map to figure out which portion of the map it should display in order to fit all of these points correctly. We get access to the mapbox methods and libraries, because we added them to the beginning of our page (mapboxgl)
	const bounds = new mapboxgl.LngLatBounds();

	locations.forEach((loc) => {
		// Create marker
		const el = document.createElement('div');
		// So now we can use css for this marker. If you look at how it looks like, it's completely created by Jonas. He imports the image of the marker and then specifies it with css
		el.className = 'marker';

		// Add marker
		new mapboxgl.Marker({
			element: el,
			// Means that it is the bottom of the element. So if we have a pointing marker, we want te pointy end to be directed to the address. This is how we do it. We could also center it, or do other stuff with it.
			anchor: 'bottom'
		})
			// So we're calling the location with loc. In the location, we specify the coordinates. Wich we then call. Then we put them on the map
			.setLngLat(loc.coordinates)
			.addTo(map);

		// Add popup
		new mapboxgl.Popup({
			// ofset it to make sure the popup and marker aren't covering each other
			offset: 30
		})
			.setLngLat(loc.coordinates)
			.setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
			.addTo(map);

		// Extend map bounds to include current location
		bounds.extend(loc.coordinates);
	});

	map.fitBounds(bounds, {
		padding: {
			top: 200,
			bottom: 150,
			left: 100,
			right: 100
		}
	});
};
