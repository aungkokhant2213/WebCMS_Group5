// js/aung-charts.js

let cityName = "Waterloo";
let cityLat = 43.4643;
let cityLon = -80.5204;

const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

function updateCity() {
  const [name, lat, lon] = document.getElementById("citySelect").value.split(",");
  cityName = name;
  cityLat = +lat;
  cityLon = +lon;

  tooltip.style("opacity", 0);
  d3.selectAll("svg > *").remove(); // clear all charts

  fetchWeatherAndUpdateCharts(cityLat, cityLon);
}

function fetchWeatherAndUpdateCharts(lat, lon) {
  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - 6);

  const start = pastDate.toISOString().split("T")[0];
  const end = today.toISOString().split("T")[0];

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}&hourly=temperature_2m,windspeed_10m,winddirection_10m&timezone=America%2FToronto`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const times = data.hourly.time;
      const temps = data.hourly.temperature_2m;
      const winds = data.hourly.windspeed_10m;
      const windDirs = data.hourly.winddirection_10m;

      const fullData = times.map((time, i) => {
        const date = new Date(time);
        return {
          day: date.toISOString().split("T")[0],
          hour: date.getHours(),
          temp: temps[i],
          wind: winds[i],
          windDir: windDirs[i]
        };
      });

      const heatmapData = fullData.map(d => ({ day: d.day, hour: d.hour, temp: d.temp }));
      const scatterData = fullData.filter(d => d.temp !== null && d.wind !== null).map(d => ({ temp: d.temp, wind: d.wind }));

      const groupedByDir = {};
      fullData.forEach(d => {
        if(d.windDir !== null){
          const dir = getCompassDirection(d.windDir);
          groupedByDir[dir] = (groupedByDir[dir] || []).concat(d.wind);
        }
      });

      const polarData = Object.entries(groupedByDir).map(([direction, values]) => ({
        direction,
        speed: d3.mean(values)
      }));

      drawHeatmap(heatmapData);
      drawScatter(scatterData);
      drawPolar(polarData);
    });
}

function drawHeatmap(data) {
  const svg = d3.select("#heatmap svg");
  const margin = { top: 30, right: 20, bottom: 80, left: 70 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const temps = data.filter(d => d.temp !== null && !isNaN(d.temp)).map(d => d.temp);
  const days = [...new Set(data.map(d => d.day))];

  const x = d3.scaleBand().domain(d3.range(0, 24)).range([0, width]).padding(0.05);
  const y = d3.scaleBand().domain(days).range([0, height]).padding(0.05);

  const color = d3.scaleSequential().interpolator(d3.interpolateCool).domain([d3.max(temps), d3.min(temps)]);

  // Draw cells with fade-in animation
  g.selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", d => x(d.hour))
    .attr("y", d => y(d.day))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => (d.temp === null || isNaN(d.temp)) ? "#ddd" : color(d.temp))
    .attr("opacity", 0)
    .transition()
    .duration(1000)
    .attr("opacity", 1)
    .on("end", function(event, d) {
      d3.select(this)
        .on("mouseover", (event, d) => {
          tooltip.transition().duration(200).style("opacity", 0.9);
          const tempText = (d.temp === null || isNaN(d.temp)) ? "No Data" : `${d.temp}°C`;
          tooltip.html(`${d.day} ${d.hour}:00<br>${tempText}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(300).style("opacity", 0));
    });

  g.append("g")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", "12px")
    .style("fill", "#333");

  g.append("g").call(d3.axisTop(x).tickFormat(d => d + ":00"));

  // Heatmap Legend
  const legendWidth = 300;
  const legendHeight = 20;
  const legendMargin = 40;

  // Append group for legend below heatmap
  const legendG = svg.append("g")
    .attr("transform", `translate(${margin.left + (width - legendWidth) / 2},${height + margin.top + legendMargin})`);

  // Create gradient for legend
  const defs = svg.append("defs");
  const linearGradient = defs.append("linearGradient")
    .attr("id", "legend-gradient");

  linearGradient.selectAll("stop")
    .data([
      {offset: "0%", color: color.range()[0]},
      {offset: "100%", color: color.range()[1]}
    ])
    .enter()
    .append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

  // Draw rect with gradient
  legendG.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)");

  // Legend axis scale
  const legendScale = d3.scaleLinear()
    .domain(color.domain())
    .range([0, legendWidth]);

  const legendAxis = d3.axisBottom(legendScale)
    .ticks(5)
    .tickFormat(d => d + "°C");

  legendG.append("g")
    .attr("transform", `translate(0,${legendHeight})`)
    .call(legendAxis);

  legendG.append("text")
    .attr("x", legendWidth / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Temperature (°C)");
}

function drawScatter(data) {
  const svg = d3.select("#scatterplot svg");
  const fullWidth = +svg.attr("width");
  const fullHeight = +svg.attr("height");

  const margin = { top: 30, right: 50, bottom: 50, left: 60 };
  const width = fullWidth - margin.left - margin.right;
  const height = fullHeight - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain(d3.extent(data, d => d.temp)).nice().range([0, width]);
  const y = d3.scaleLinear().domain(d3.extent(data, d => d.wind)).nice().range([height, 0]);

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  g.append("g").call(d3.axisLeft(y));

  // Axis labels
  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Temperature (°C)");

  g.append("text")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Wind Speed (km/h)");

  // Points
  g.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => x(d.temp))
    .attr("cy", d => y(d.wind))
    .attr("r", 0)
    .attr("fill", "#3498db")
    .attr("opacity", 0.7)
    .transition()
    .duration(1000)
    .attr("r", 4)
    .on("end", function () {
      d3.select(this)
        .on("mouseover", (event, d) => {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip.html(`Temp: ${d.temp.toFixed(1)}°C<br>Wind: ${d.wind.toFixed(1)} km/h`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(300).style("opacity", 0));
    });

  // Legend (placed above chart for visibility)
  svg.selectAll(".scatter-legend").remove(); // clear existing

  const legend = svg.append("g")
    .attr("class", "scatter-legend")
    .attr("transform", `translate(${margin.left + 10},10)`);

  legend.append("circle")
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("r", 6)
    .attr("fill", "#3498db")
    .attr("opacity", 0.7);

  legend.append("text")
    .attr("x", 12)
    .attr("y", 4)
    .style("font-size", "13px")
    .text("Wind Speed vs Temperature");
}


function drawPolar(data) {
  const svg = d3.select("#polar svg");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const radius = Math.min(width, height) / 2 - 40;
  const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

  const angle = d3.scaleBand().domain(data.map(d => d.direction)).range([0, 2 * Math.PI]);
  const r = d3.scaleLinear().domain([0, d3.max(data, d => d.speed)]).range([0, radius]);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(d => r(d.speed))
    .startAngle(d => angle(d.direction))
    .endAngle(d => angle(d.direction) + angle.bandwidth());

  g.selectAll("path")
    .data(data)
    .join("path")
    .attr("d", d => {
      // Start arcs with zero radius for animation
      const startArc = d3.arc()
        .innerRadius(0)
        .outerRadius(0)
        .startAngle(angle(d.direction))
        .endAngle(angle(d.direction) + angle.bandwidth());
      return startArc();
    })
    .attr("fill", "#e67e22")
    .attr("stroke", "#fff")
    .transition()
    .duration(1000)
    .attrTween("d", function(d) {
      const interpolate = d3.interpolate(
        d3.arc()
          .innerRadius(0)
          .outerRadius(0)
          .startAngle(angle(d.direction))
          .endAngle(angle(d.direction) + angle.bandwidth())(),
        arc(d)
      );
      return function(t) {
        return interpolate(t);
      };
    })
    .on("end", function(event, d) {
      d3.select(this)
        .on("mouseover", (event, d) => {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip.html(`${d.direction}<br>${d.speed.toFixed(1)} km/h`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
    });

  g.selectAll("text")
    .data(data)
    .join("text")
    .attr("text-anchor", "middle")
    .attr("transform", d => {
      const a = angle(d.direction) + angle.bandwidth() / 2 - Math.PI / 2;
      return `translate(${Math.cos(a) * (radius + 15)}, ${Math.sin(a) * (radius + 15)})`;
    })
    .text(d => d.direction)
    .style("font-size", "12px");

  // Polar Area Chart Legend
  const legendG = svg.append("g")
    .attr("transform", `translate(20,20)`);

  legendG.append("rect")
    .attr("width", 15)
    .attr("height", 15)
    .attr("fill", "#e67e22");

  legendG.append("text")
    .attr("x", 20)
    .attr("y", 12)
    .style("font-size", "12px")
    .text("Average Wind Speed by Direction");
}

function getCompassDirection(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

// Initialize with default city
updateCity();
