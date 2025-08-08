// Marine Weather Dashboard JavaScript

// Global variables
let marineData = null;
let currentCharts = {};

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    // Add event listeners for better UX
    setupEventListeners();
    
    // Load initial data
    fetchMarineData();
    
    // Add keyboard navigation
    setupKeyboardNavigation();
}

function setupEventListeners() {
    // Add enter key support for inputs
    const inputs = document.querySelectorAll('.controls input');
    inputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                fetchMarineData();
            }
        });
    });
    
    // Add real-time validation
    inputs.forEach(input => {
        input.addEventListener('input', validateInput);
    });
}

function setupKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            fetchMarineData();
        }
    });
}

function validateInput(e) {
    const input = e.target;
    const value = parseFloat(input.value);
    
    if (input.id === 'latitude') {
        if (value < -90 || value > 90) {
            input.style.borderColor = 'var(--danger-color)';
            input.title = 'Latitude must be between -90 and 90';
        } else {
            input.style.borderColor = 'var(--border-color)';
            input.title = '';
        }
    } else if (input.id === 'longitude') {
        if (value < -180 || value > 180) {
            input.style.borderColor = 'var(--danger-color)';
            input.title = 'Longitude must be between -180 and 180';
        } else {
            input.style.borderColor = 'var(--border-color)';
            input.title = '';
        }
    }
}

async function fetchMarineData() {
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;
    
    if (!latitude || !longitude) {
        showError('Please enter valid latitude and longitude coordinates.');
        return;
    }
    
    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        showError('Please enter valid coordinates: Latitude (-90 to 90), Longitude (-180 to 180)');
        return;
    }
    
    showLoading(true);
    hideError();
    
    try {
        const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature,wind_wave_height,swell_wave_height&daily=wave_height_max,wave_direction_dominant&timezone=auto`;
        
        console.log('Fetching marine data from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Marine data received:', data);
        
        if (data.error) {
            throw new Error(data.reason || 'Failed to fetch marine data');
        }
        
        // Check if we have the required data
        if (!data.hourly || !data.hourly.time || data.hourly.time.length === 0) {
            throw new Error('No hourly data available for this location');
        }
        
        marineData = data;
        displayCurrentConditions(data);
        createCharts(data);
        showLoading(false);
        
        // Show success message
        showSuccess(`Marine weather data loaded for coordinates (${latitude}, ${longitude})`);
        
    } catch (error) {
        console.error('Error fetching marine data:', error);
        showError(`Failed to fetch marine weather data: ${error.message}`);
        showLoading(false);
    }
}

function displayCurrentConditions(data) {
    const currentContainer = document.getElementById('current-conditions');
    const currentGrid = document.getElementById('current-grid');
    
    console.log('Displaying current conditions with data:', data);
    
    if (!data.hourly || data.hourly.time.length === 0) {
        console.error('No hourly data available');
        return;
    }
    
    // Get current data (first entry)
    const current = {
        waveHeight: data.hourly.wave_height ? data.hourly.wave_height[0] : null,
        waveDirection: data.hourly.wave_direction ? data.hourly.wave_direction[0] : null,
        wavePeriod: data.hourly.wave_period ? data.hourly.wave_period[0] : null,
        temperature: data.hourly.sea_surface_temperature ? data.hourly.sea_surface_temperature[0] : null,
        windWaveHeight: data.hourly.wind_wave_height ? data.hourly.wind_wave_height[0] : null,
        swellWaveHeight: data.hourly.swell_wave_height ? data.hourly.swell_wave_height[0] : null
    };
    
    console.log('Current conditions:', current);
    
    currentGrid.innerHTML = `
        <div class="current-item" data-tooltip="Current significant wave height">
            <h4>Wave Height</h4>
            <div class="value">${current.waveHeight !== null ? current.waveHeight.toFixed(1) : 'N/A'} m</div>
        </div>
        <div class="current-item" data-tooltip="Mean wave direction in degrees">
            <h4>Wave Direction</h4>
            <div class="value">${current.waveDirection !== null ? current.waveDirection.toFixed(0) : 'N/A'}°</div>
        </div>
        <div class="current-item" data-tooltip="Wave period in seconds">
            <h4>Wave Period</h4>
            <div class="value">${current.wavePeriod !== null ? current.wavePeriod.toFixed(1) : 'N/A'} s</div>
        </div>
        <div class="current-item" data-tooltip="Sea surface temperature">
            <h4>Sea Temperature</h4>
            <div class="value">${current.temperature !== null ? current.temperature.toFixed(1) : 'N/A'}°C</div>
        </div>
        <div class="current-item" data-tooltip="Wind-generated wave height">
            <h4>Wind Wave Height</h4>
            <div class="value">${current.windWaveHeight !== null ? current.windWaveHeight.toFixed(1) : 'N/A'} m</div>
        </div>
        <div class="current-item" data-tooltip="Swell wave height">
            <h4>Swell Wave Height</h4>
            <div class="value">${current.swellWaveHeight !== null ? current.swellWaveHeight.toFixed(1) : 'N/A'} m</div>
        </div>
    `;
    
    currentContainer.style.display = 'block';
    
    // Add tooltip functionality
    addTooltips();
}

function addTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(e) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = e.target.dataset.tooltip;
    tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        z-index: 1000;
        pointer-events: none;
        white-space: nowrap;
        transform: translateY(-100%);
        margin-top: -8px;
    `;
    
    document.body.appendChild(tooltip);
    
    const rect = e.target.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top + 'px';
    
    e.target.tooltip = tooltip;
}

function hideTooltip(e) {
    if (e.target.tooltip) {
        e.target.tooltip.remove();
        e.target.tooltip = null;
    }
}

function createCharts(data) {
    if (!data.hourly || data.hourly.time.length === 0) return;
    
    // Clear existing charts
    clearCharts();
    
    createWaveHeightChart(data);
    createWaveDirectionChart(data);
    createTemperatureChart(data);
    createWavePeriodChart(data);
}

function clearCharts() {
    Object.values(currentCharts).forEach(chart => {
        if (chart && chart.remove) {
            chart.remove();
        }
    });
    currentCharts = {};
}

function createWaveHeightChart(data) {
    const container = document.getElementById('wave-height-chart');
    container.innerHTML = '';
    
    if (!data.hourly || !data.hourly.time || !data.hourly.wave_height) {
        console.error('Missing wave height data');
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;">No wave height data available</p>';
        return;
    }
    
    const margin = {top: 30, right: 40, bottom: 80, left: 70};
    const width = container.clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Parse dates and ensure data is numeric
    const dates = data.hourly.time.map(d => new Date(d));
    const waveHeights = data.hourly.wave_height.map(h => parseFloat(h) || 0);
    
    console.log('Wave height data:', waveHeights);
    
    // Scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(dates))
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(waveHeights) * 1.1])
        .range([height, 0]);
    
    // Line generator with smooth curve
    const line = d3.line()
        .x(d => xScale(new Date(d.time)))
        .y(d => yScale(d.height))
        .curve(d3.curveMonotoneX);
    
    // Create line path
    const lineData = dates.map((date, i) => ({
        time: date,
        height: waveHeights[i]
    }));
    
    // Add gradient
    const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'waveHeightGradient')
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', yScale(d3.max(waveHeights)))
        .attr('x2', 0).attr('y2', yScale(0));
    
    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', 'var(--primary-color)')
        .attr('stop-opacity', 0.3);
    
    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', 'var(--primary-color)')
        .attr('stop-opacity', 0.1);
    
    // Add area
    const area = d3.area()
        .x(d => xScale(new Date(d.time)))
        .y0(height)
        .y1(d => yScale(d.height))
        .curve(d3.curveMonotoneX);
    
    svg.append('path')
        .datum(lineData)
        .attr('fill', 'url(#waveHeightGradient)')
        .attr('d', area);
    
    // Add line
    svg.append('path')
        .datum(lineData)
        .attr('fill', 'none')
        .attr('stroke', 'var(--primary-color)')
        .attr('stroke-width', 3)
        .attr('d', line);
    
    // Add dots with tooltips
    const dots = svg.selectAll('.dot')
        .data(lineData)
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(d.time))
        .attr('cy', d => yScale(d.height))
        .attr('r', 0)
        .attr('fill', 'var(--primary-color)')
        .attr('stroke', 'var(--white)')
        .attr('stroke-width', 2);
    
    // Animate dots
    dots.transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .attr('r', 4);
    
    // Add tooltips to dots
    dots.on('mouseover', function(event, d) {
        d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 6)
            .attr('fill', 'var(--primary-dark)');
        
        showChartTooltip(event, `Time: ${d.time.toLocaleString()}<br>Wave Height: ${d.height.toFixed(1)}m`);
    })
    .on('mouseout', function() {
        d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 4)
            .attr('fill', 'var(--primary-color)');
        
        hideChartTooltip();
    });
    
    // Enhanced axes with better time formatting
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%b %d, %H:%M'))
        .tickSize(-height)
        .tickPadding(15)
        .ticks(d3.timeDay.every(1));
    
    const yAxis = d3.axisLeft(yScale)
        .tickSize(-width)
        .tickPadding(10);
    
    // Add grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line').attr('stroke', 'var(--border-color)').attr('stroke-opacity', 0.3))
        .call(g => g.selectAll('.tick text')
            .style('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', 'var(--text-light)')
            .style('font-weight', '500')
            .style('dominant-baseline', 'hanging'));
    
    svg.append('g')
        .attr('class', 'grid')
        .call(yAxis)
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line').attr('stroke', 'var(--border-color)').attr('stroke-opacity', 0.3))
        .call(g => g.selectAll('.tick text')
            .style('font-size', '12px')
            .style('fill', 'var(--text-light)')
            .style('font-weight', '500'));
    
    // Labels
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .style('font-weight', '600')
        .style('fill', 'var(--text-dark)')
        .style('font-size', '14px')
        .text('Time');
    
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 20)
        .attr('x', -height / 2)
        .style('text-anchor', 'middle')
        .style('font-weight', '600')
        .style('fill', 'var(--text-dark)')
        .style('font-size', '14px')
        .text('Wave Height (m)');
    
    currentCharts.waveHeight = svg;
}

function createWaveDirectionChart(data) {
    const container = document.getElementById('wave-direction-chart');
    container.innerHTML = '';
    
    if (!data.hourly || !data.hourly.time || !data.hourly.wave_direction) {
        console.error('Missing wave direction data');
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;">No wave direction data available</p>';
        return;
    }
    
    const margin = {top: 30, right: 40, bottom: 80, left: 70};
    const width = container.clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const dates = data.hourly.time.map(d => new Date(d));
    const directions = data.hourly.wave_direction.map(d => parseFloat(d) || 0);
    
    console.log('Wave direction data:', directions);
    
    const xScale = d3.scaleTime()
        .domain(d3.extent(dates))
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, 360])
        .range([height, 0]);
    
    const line = d3.line()
        .x(d => xScale(new Date(d.time)))
        .y(d => yScale(d.direction))
        .curve(d3.curveMonotoneX);
    
    const lineData = dates.map((date, i) => ({
        time: date,
        direction: directions[i]
    }));
    
    // Add line
    svg.append('path')
        .datum(lineData)
        .attr('fill', 'none')
        .attr('stroke', 'var(--danger-color)')
        .attr('stroke-width', 3)
        .attr('d', line);
    
    // Add dots
    const dots = svg.selectAll('.dot')
        .data(lineData)
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(d.time))
        .attr('cy', d => yScale(d.direction))
        .attr('r', 0)
        .attr('fill', 'var(--danger-color)')
        .attr('stroke', 'var(--white)')
        .attr('stroke-width', 2);
    
    // Animate dots
    dots.transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .attr('r', 4);
    
    // Add tooltips
    dots.on('mouseover', function(event, d) {
        d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 6)
            .attr('fill', '#c0392b');
        
        showChartTooltip(event, `Time: ${d.time.toLocaleString()}<br>Direction: ${d.direction.toFixed(0)}°`);
    })
    .on('mouseout', function() {
        d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 4)
            .attr('fill', 'var(--danger-color)');
        
        hideChartTooltip();
    });
    
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%b %d, %H:%M'))
        .tickSize(-height)
        .tickPadding(15)
        .ticks(d3.timeDay.every(1));
    
    const yAxis = d3.axisLeft(yScale)
        .ticks(8)
        .tickSize(-width)
        .tickPadding(10);
    
    // Add grid
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line').attr('stroke', 'var(--border-color)').attr('stroke-opacity', 0.3))
        .call(g => g.selectAll('.tick text')
            .style('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', 'var(--text-light)')
            .style('font-weight', '500')
            .style('dominant-baseline', 'hanging'));
    
    svg.append('g')
        .attr('class', 'grid')
        .call(yAxis)
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line').attr('stroke', 'var(--border-color)').attr('stroke-opacity', 0.3))
        .call(g => g.selectAll('.tick text')
            .style('font-size', '12px')
            .style('fill', 'var(--text-light)')
            .style('font-weight', '500'));
    
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .style('font-weight', '600')
        .style('fill', 'var(--text-dark)')
        .style('font-size', '14px')
        .text('Time');
    
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 20)
        .attr('x', -height / 2)
        .style('text-anchor', 'middle')
        .style('font-weight', '600')
        .style('fill', 'var(--text-dark)')
        .style('font-size', '14px')
        .text('Wave Direction (°)');
    
    currentCharts.waveDirection = svg;
}

function createTemperatureChart(data) {
    const container = document.getElementById('temperature-chart');
    container.innerHTML = '';
    
    if (!data.hourly || !data.hourly.time || !data.hourly.sea_surface_temperature) {
        console.error('Missing temperature data');
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;">No temperature data available</p>';
        return;
    }
    
    const margin = {top: 30, right: 40, bottom: 80, left: 70};
    const width = container.clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const dates = data.hourly.time.map(d => new Date(d));
    const temperatures = data.hourly.sea_surface_temperature.map(t => parseFloat(t) || 0);
    
    console.log('Temperature data:', temperatures);
    
    const xScale = d3.scaleTime()
        .domain(d3.extent(dates))
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([d3.min(temperatures) - 2, d3.max(temperatures) + 2])
        .range([height, 0]);
    
    const line = d3.line()
        .x(d => xScale(new Date(d.time)))
        .y(d => yScale(d.temp))
        .curve(d3.curveMonotoneX);
    
    const lineData = dates.map((date, i) => ({
        time: date,
        temp: temperatures[i]
    }));
    
    svg.append('path')
        .datum(lineData)
        .attr('fill', 'none')
        .attr('stroke', 'var(--warning-color)')
        .attr('stroke-width', 3)
        .attr('d', line);
    
    const dots = svg.selectAll('.dot')
        .data(lineData)
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(d.time))
        .attr('cy', d => yScale(d.temp))
        .attr('r', 0)
        .attr('fill', 'var(--warning-color)')
        .attr('stroke', 'var(--white)')
        .attr('stroke-width', 2);
    
    dots.transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .attr('r', 4);
    
    dots.on('mouseover', function(event, d) {
        d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 6)
            .attr('fill', '#e67e22');
        
        showChartTooltip(event, `Time: ${d.time.toLocaleString()}<br>Temperature: ${d.temp.toFixed(1)}°C`);
    })
    .on('mouseout', function() {
        d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 4)
            .attr('fill', 'var(--warning-color)');
        
        hideChartTooltip();
    });
    
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%b %d, %H:%M'))
        .tickSize(-height)
        .tickPadding(15)
        .ticks(d3.timeDay.every(1));
    
    const yAxis = d3.axisLeft(yScale)
        .tickSize(-width)
        .tickPadding(10);
    
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line').attr('stroke', 'var(--border-color)').attr('stroke-opacity', 0.3))
        .call(g => g.selectAll('.tick text')
            .style('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', 'var(--text-light)')
            .style('font-weight', '500')
            .style('dominant-baseline', 'hanging'));
    
    svg.append('g')
        .attr('class', 'grid')
        .call(yAxis)
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line').attr('stroke', 'var(--border-color)').attr('stroke-opacity', 0.3))
        .call(g => g.selectAll('.tick text')
            .style('font-size', '12px')
            .style('fill', 'var(--text-light)')
            .style('font-weight', '500'));
    
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .style('font-weight', '600')
        .style('fill', 'var(--text-dark)')
        .style('font-size', '14px')
        .text('Time');
    
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 20)
        .attr('x', -height / 2)
        .style('text-anchor', 'middle')
        .style('font-weight', '600')
        .style('fill', 'var(--text-dark)')
        .style('font-size', '14px')
        .text('Temperature (°C)');
    
    currentCharts.temperature = svg;
}

function createWavePeriodChart(data) {
    const container = document.getElementById('wave-period-chart');
    container.innerHTML = '';
    
    if (!data.hourly || !data.hourly.time || !data.hourly.wave_period) {
        console.error('Missing wave period data');
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;">No wave period data available</p>';
        return;
    }
    
    const margin = {top: 30, right: 40, bottom: 80, left: 70};
    const width = container.clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const dates = data.hourly.time.map(d => new Date(d));
    const periods = data.hourly.wave_period.map(p => parseFloat(p) || 0);
    
    console.log('Wave period data:', periods);
    
    const xScale = d3.scaleTime()
        .domain(d3.extent(dates))
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(periods) * 1.1])
        .range([height, 0]);
    
    const line = d3.line()
        .x(d => xScale(new Date(d.time)))
        .y(d => yScale(d.period))
        .curve(d3.curveMonotoneX);
    
    const lineData = dates.map((date, i) => ({
        time: date,
        period: periods[i]
    }));
    
    svg.append('path')
        .datum(lineData)
        .attr('fill', 'none')
        .attr('stroke', 'var(--success-color)')
        .attr('stroke-width', 3)
        .attr('d', line);
    
    const dots = svg.selectAll('.dot')
        .data(lineData)
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(d.time))
        .attr('cy', d => yScale(d.period))
        .attr('r', 0)
        .attr('fill', 'var(--success-color)')
        .attr('stroke', 'var(--white)')
        .attr('stroke-width', 2);
    
    dots.transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .attr('r', 4);
    
    dots.on('mouseover', function(event, d) {
        d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 6)
            .attr('fill', '#229954');
        
        showChartTooltip(event, `Time: ${d.time.toLocaleString()}<br>Period: ${d.period.toFixed(1)}s`);
    })
    .on('mouseout', function() {
        d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 4)
            .attr('fill', 'var(--success-color)');
        
        hideChartTooltip();
    });
    
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%b %d, %H:%M'))
        .tickSize(-height)
        .tickPadding(15)
        .ticks(d3.timeDay.every(1));
    
    const yAxis = d3.axisLeft(yScale)
        .tickSize(-width)
        .tickPadding(10);
    
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line').attr('stroke', 'var(--border-color)').attr('stroke-opacity', 0.3))
        .call(g => g.selectAll('.tick text')
            .style('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', 'var(--text-light)')
            .style('font-weight', '500')
            .style('dominant-baseline', 'hanging'));
    
    svg.append('g')
        .attr('class', 'grid')
        .call(yAxis)
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line').attr('stroke', 'var(--border-color)').attr('stroke-opacity', 0.3))
        .call(g => g.selectAll('.tick text')
            .style('font-size', '12px')
            .style('fill', 'var(--text-light)')
            .style('font-weight', '500'));
    
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .style('font-weight', '600')
        .style('fill', 'var(--text-dark)')
        .style('font-size', '14px')
        .text('Time');
    
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 20)
        .attr('x', -height / 2)
        .style('text-anchor', 'middle')
        .style('font-weight', '600')
        .style('fill', 'var(--text-dark)')
        .style('font-size', '14px')
        .text('Wave Period (s)');
    
    currentCharts.wavePeriod = svg;
}

function showChartTooltip(event, content) {
    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.innerHTML = content;
    tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        z-index: 1000;
        pointer-events: none;
        white-space: nowrap;
        transform: translateX(-50%);
        margin-top: -40px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    document.body.appendChild(tooltip);
    
    tooltip.style.left = event.pageX + 'px';
    tooltip.style.top = event.pageY + 'px';
    
    document.chartTooltip = tooltip;
}

function hideChartTooltip() {
    if (document.chartTooltip) {
        document.chartTooltip.remove();
        document.chartTooltip = null;
    }
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    loading.style.display = show ? 'block' : 'none';
}

function showError(message) {
    const error = document.getElementById('error');
    error.textContent = message;
    error.style.display = 'block';
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
        hideError();
    }, 5000);
}

function showSuccess(message) {
    // Create success notification
    const success = document.createElement('div');
    success.className = 'success-notification';
    success.textContent = message;
    success.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success-color);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: var(--shadow-medium);
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(success);
    
    // Animate in
    setTimeout(() => {
        success.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        success.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (success.parentNode) {
                success.parentNode.removeChild(success);
            }
        }, 300);
    }, 3000);
}

function hideError() {
    const error = document.getElementById('error');
    error.style.display = 'none';
}
