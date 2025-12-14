// script.js

// Mock Data Generation
const generateMockData = (count) => {
    const data = [];
    const statuses = ['Detected', 'No Panel', 'Occluded'];

    for (let i = 1; i <= count; i++) {
        const hasPV = Math.random() > 0.4; // 60% chance of PV
        const roofArea = Math.floor(Math.random() * (3000 - 800) + 800);
        const pvArea = hasPV ? Math.floor(Math.random() * (roofArea * 0.4 - 5) + 5) : 0;
        const conf = hasPV ? (Math.random() * (0.99 - 0.75) + 0.75).toFixed(2) : 0.00;

        data.push({
            id: `SMPL-${1000 + i}`,
            status: hasPV ? 'Detected' : 'No Panel',
            roofArea: roofArea,
            pvArea: pvArea,
            confidence: conf,
            lat: (28.6 + Math.random() * 0.1).toFixed(6),
            lon: (77.2 + Math.random() * 0.1).toFixed(6),
            address: `Sector ${Math.floor(Math.random() * 20)}, Noida, UP`,
            timestamp: new Date().toISOString(),
            image: hasPV ? 'https://via.placeholder.com/600x400/0f172a/38bdf8?text=PV+Detected' : 'https://via.placeholder.com/600x400/0f172a/94a3b8?text=No+Panel'
        });
    }
    return data;
};

// State
let samples = [];
let filteredSamples = [];
let map;
let marker;
let currentSample = null;

// Leaflet Map Init
function initMap() {
    // Default center (India)
    map = L.map('map-view').setView([20.5937, 78.9629], 5);

    // Esri World Imagery (Satellite)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }).addTo(map);

    // Optional: Add Labels
    // L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', { ... }).addTo(map);
}

function switchView(mode) {
    document.getElementById('image-view').style.display = mode === 'image' ? 'flex' : 'none';
    document.getElementById('map-view').style.display = mode === 'map' ? 'block' : 'none';

    document.getElementById('btn-view-image').classList.toggle('active', mode === 'image');
    document.getElementById('btn-view-map').classList.toggle('active', mode === 'map');

    // Invalidate size to ensure map renders correctly after being hidden
    if (mode === 'map' && map) {
        setTimeout(() => map.invalidateSize(), 100);
    }
}

// DOM Elements
const sampleListEl = document.getElementById('sample-list');
const searchInput = document.getElementById('search-input');
const totalProcessedEl = document.getElementById('total-processed');
const pvFoundEl = document.getElementById('pv-found-count');

// Details Elements
const vizDisplayEl = document.getElementById('viz-display');
const roofAreaEl = document.getElementById('roof-area');
const pvAreaEl = document.getElementById('pv-area');
const confScoreEl = document.getElementById('confidence-score');
const latEl = document.getElementById('lat-val');
const lonEl = document.getElementById('lon-val');
const addressEl = document.getElementById('address-val');
const qcBadgeEl = document.getElementById('qc-badge');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize map immediately
    initMap();

    fetch('../../output/summary_report.json')
        .then(response => {
            if (!response.ok) throw new Error("No data found");
            return response.json();
        })
        .then(data => {
            console.log("Loaded real data:", data);
            // Transform keys to match UI expectations if needed
            samples = data.map(d => ({
                id: d.id,
                status: d.status === 'QC_PASS' ? 'Detected' : (d.status === 'NO_DETECT' ? 'No Panel' : d.status),
                roofArea: 1500, // Placeholder as we calculate PV area only
                pvArea: d.pv_area_sqm,
                confidence: d.confidence,
                lat: "28.5", // simplify or fetch from merge
                lon: "77.4",
                address: "Unknown Location",
                timestamp: new Date().toISOString(),
                image: d.image_path ? "../../" + d.image_path : 'https://via.placeholder.com/600x400'
            }));
            filteredSamples = samples;
            updateStats();
            updateStats();
            renderSampleList();
            initChart(samples);
            setTimeout(() => drawRoute(samples), 500);
        })
        .catch(err => {
            console.warn("Using mock data:", err);
            filteredSamples = samples;
            updateStats();
            renderSampleList();
            initChart(samples);
            setTimeout(() => drawRoute(samples), 500);
        })
        .catch(err => {
            console.warn("Using mock data:", err);
            // Fallback to Mock
            samples = generateMockData(25);
            filteredSamples = samples;
            updateStats();
            renderSampleList();
            initChart(samples);
            setTimeout(() => drawRoute(samples), 500);
        });

    // Event Listeners
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        filteredSamples = samples.filter(s => s.id.toLowerCase().includes(term));
        renderSampleList();
    });
});

function updateStats() {
    totalProcessedEl.innerText = samples.length;
    const pvCount = samples.filter(s => s.status === 'Detected').length;
    pvFoundEl.innerText = pvCount;
}

function renderSampleList() {
    sampleListEl.innerHTML = '';

    if (filteredSamples.length === 0) {
        sampleListEl.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">No results found</div>';
        return;
    }

    filteredSamples.forEach(sample => {
        const item = document.createElement('div');
        item.className = 'sample-item';
        item.onclick = () => selectSample(sample, item);

        const statusClass = sample.status === 'Detected' ? 'status-detected' : 'status-nodetect';

        item.innerHTML = `
            <div class="sample-id">
                ${sample.id}
                <span class="sample-status ${statusClass}">${sample.status}</span>
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
                <i class="fa-solid fa-location-dot"></i> ${sample.lat}, ${sample.lon}
            </div>
        `;
        sampleListEl.appendChild(item);
    });
}

function selectSample(sample, itemEl) {
    // Active class handling
    if (itemEl) {
        document.querySelectorAll('.sample-item').forEach(el => el.classList.remove('active'));
        itemEl.classList.add('active');
    }

    // Update Details
    roofAreaEl.innerText = sample.roofArea;
    pvAreaEl.innerText = sample.pvArea;
    confScoreEl.innerText = (sample.confidence * 100).toFixed(0) + '%';
    latEl.innerText = sample.lat;
    lonEl.innerText = sample.lon;
    addressEl.innerText = sample.address;

    // Update Badge
    qcBadgeEl.innerText = sample.status === 'Detected' ? 'QC PASS' : 'AUTO-REJECT';
    qcBadgeEl.style.background = sample.status === 'Detected' ? 'var(--success)' : 'var(--border-color)';

    // Update Image
    const imgContainer = document.getElementById('image-view');
    if (imgContainer) imgContainer.innerHTML = `<img src="${sample.image}" alt="Detection Output">`;
    else vizDisplayEl.innerHTML = `<img src="${sample.image}" alt="Detection Output">`;

    // Update Map if initialized
    if (map && sample.lat && sample.lon) {
        const lat = parseFloat(sample.lat);
        const lng = parseFloat(sample.lon);
        if (!isNaN(lat) && !isNaN(lng)) {
            const latLng = [lat, lng];
            map.setView(latLng, 20);

            // Standard selection marker
            if (marker) map.removeLayer(marker);

            marker = L.marker(latLng).addTo(map)
                .bindPopup(sample.id)
                .openPopup();
        }
    }

    currentSample = sample;

    // Animate panel slightly
    const panel = document.querySelector('.details-panel');
    panel.style.opacity = '0.5';
    setTimeout(() => panel.style.opacity = '1', 150);
}

// Chart Logic
let analysisChart = null;

function initChart(data) {
    const ctx = document.getElementById('analysisChart').getContext('2d');

    // Aggregate Data: Count by Status
    const stats = {
        'Detected': 0,
        'No Panel': 0
    };

    data.forEach(d => {
        if (d.status === 'Detected') stats['Detected']++;
        else stats['No Panel']++;
    });

    if (analysisChart) analysisChart.destroy();

    analysisChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['PV Detected', 'No Panel'],
            datasets: [{
                data: [stats['Detected'], stats['No Panel']],
                backgroundColor: ['#22c55e', '#94a3b8'],
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#f1f5f9', font: { family: 'Outfit' } }
                }
            }
        }
    });
}

// Route Logic
let flightPath = null;
let allMarkers = [];

function drawRoute(data) {
    if (!map) return;

    // Clear existing
    if (flightPath) map.removeLayer(flightPath);
    allMarkers.forEach(m => map.removeLayer(m));
    allMarkers = [];

    const pathCoords = [];

    data.forEach(sample => {
        const lat = parseFloat(sample.lat);
        const lng = parseFloat(sample.lon);

        if (!isNaN(lat) && !isNaN(lng)) {
            const latLng = [lat, lng]; // Leaflet uses [lat, lng] array
            pathCoords.push(latLng);

            // Add Marker with color coding
            const isDetected = sample.status === 'Detected';

            // Leaflet Custom Icons
            const iconColor = isDetected ? 'green' : 'red';
            // Using a simple workaround for colored markers in Leaflet or default
            // For robustness, let's use circle markers which are built-in and cleaner

            const circle = L.circleMarker(latLng, {
                radius: 8,
                fillColor: isDetected ? '#22c55e' : '#ef4444',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);

            circle.bindTooltip(`${sample.id}: ${sample.status}`);
            circle.on('click', () => {
                selectSample(sample, null);
            });

            allMarkers.push(circle);
        }
    });

    // Draw Polyline
    flightPath = L.polyline(pathCoords, {
        color: '#38bdf8',
        weight: 4,
        opacity: 0.8,
        dashArray: '5, 10' // dashed for "flight path" look
    }).addTo(map);

    // Fit bounds
    if (pathCoords.length > 0) {
        map.fitBounds(L.latLngBounds(pathCoords));
    }
}

// Report Logic
const reportBtn = document.getElementById('generate-report-btn');
if (reportBtn) {
    reportBtn.addEventListener('click', () => {
        window.print();
    });
}
