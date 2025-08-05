// js/aung-charts.js

const days = ["2025-07-30", "2025-07-31", "2025-08-01", "2025-08-02", "2025-08-03", "2025-08-04", "2025-08-05"];
const hours = d3.range(0, 24);

const tempData = [];
days.forEach(day => {
  hours.forEach(hour => {
    tempData.push({
      day,
      hour,
      temp: Math.floor(Math.random() * 20) + 15
    });
  });
});

const scatterData = d3.range(100).map(() => ({
  temp: Math.random() * 30 + 10,
  wind: Math.random() * 40
}));

const polarData = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"].map(dir => ({
  direction: dir,
  speed: Math.random() * 30 + 5
}));

// Tooltip container
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

function heatmapChart() {
  const svg = d3.select("#heatmap svg");
  const margin = { top: 30, right: 20, bottom: 30, left: 40 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(hours).range([0, width]).padding(0.05);
  const y = d3.scaleBand().domain(days).range([0, height]).padding(0.05);
  const color = d3.scaleSequential().interpolator(d3.interpolateCool).domain([35, 15]);

  g.selectAll("rect")
    .data(tempData)
    .join("rect")
    .attr("x", d => x(d.hour))
    .attr("y", d => y(d.day))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d.temp))
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`Day: ${d.day}<br>Hour: ${d.hour}<br>Temp: ${d.temp}°C`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));

  g.append("g").call(d3.axisTop(x).tickFormat(d => d + ":00"));
  g.append("g").call(d3.axisLeft(y));

  // Legend
  const legend = d3.select("#heatmap-legend");
  legend.html("<span>Temperature °C:</span>");
  for (let t = 15; t <= 35; t += 2) {
    legend.append("span")
      .style("display", "inline-block")
      .style("width", "20px")
      .style("height", "10px")
      .style("background", color(t))
      .style("margin", "0 2px")
      .attr("title", `${t}°`);
  }
}

function scatterPlot() {
  const svg = d3.select("#scatterplot svg");
  const margin = { top: 30, right: 30, bottom: 40, left: 50 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([10, 40]).range([0, width]);
  const y = d3.scaleLinear().domain([0, 40]).range([height, 0]);

  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));

  g.selectAll("circle")
    .data(scatterData)
    .join("circle")
    .attr("cx", d => x(d.temp))
    .attr("cy", d => y(d.wind))
    .attr("r", 5)
    .attr("fill", "#3498db")
    .attr("opacity", 0.7)
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`Temp: ${d.temp.toFixed(1)}°C<br>Wind: ${d.wind.toFixed(1)} km/h`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
}

function polarChart() {
  const svg = d3.select("#polar svg");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const radius = Math.min(width, height) / 2 - 40;

  const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

  const angle = d3.scaleBand().domain(polarData.map(d => d.direction)).range([0, 2 * Math.PI]);
  const r = d3.scaleLinear().domain([0, 40]).range([0, radius]);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(d => r(d.speed))
    .startAngle(d => angle(d.direction))
    .endAngle(d => angle(d.direction) + angle.bandwidth());

  g.selectAll("path")
    .data(polarData)
    .join("path")
    .attr("d", arc)
    .attr("fill", "#e67e22")
    .attr("stroke", "#fff")
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`Direction: ${d.direction}<br>Speed: ${d.speed.toFixed(1)} km/h`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));

  // Labels
  g.selectAll("text")
    .data(polarData)
    .join("text")
    .attr("text-anchor", "middle")
    .attr("transform", d => {
      const a = angle(d.direction) + angle.bandwidth() / 2 - Math.PI / 2;
      const x = Math.cos(a) * (radius + 20);
      const y = Math.sin(a) * (radius + 20);
      return `translate(${x},${y})`;
    })
    .text(d => d.direction)
    .style("font-size", "12px");

  // Legend
  const legend = d3.select("#polar-legend");
  legend.html(`<span>Wind Speeds</span>`);
  [10, 20, 30, 40].forEach(s => {
    legend.append("span")
      .style("display", "inline-block")
      .style("width", "20px")
      .style("height", "10px")
      .style("margin", "0 2px")
      .style("background", "#e67e22")
      .attr("title", `${s} km/h`);
  });
}

heatmapChart();
scatterPlot();
polarChart();
