const cities = {
  Toronto:     { lat: 43.65107, lon: -79.347015 },
  Vancouver:   { lat: 49.2827,  lon: -123.1207  },
  Montreal:    { lat: 45.5017,  lon: -73.5673   },
  Calgary:     { lat: 51.0447,  lon: -114.0719  },
  Edmonton:    { lat: 53.5461,  lon: -113.4938  },
  Ottawa:      { lat: 45.4215,  lon: -75.6996   },
  Winnipeg:    { lat: 49.8951,  lon: -97.1384   },
  Halifax:     { lat: 44.6488,  lon: -63.5752   },
  Brampton:    { lat: 43.7315,  lon: -79.7624   },
  Mississauga: { lat: 43.5890,  lon: -79.6441   },
  Kitchener:   { lat: 43.4516,  lon: -80.4925   },
  Waterloo:    { lat: 43.4643,  lon: -80.5204   },
  Cambridge:   { lat: 43.3616,  lon: -80.3144   }
};

const weatherCodeMeanings = {
  0: "Clear sky ☀️", 1: "Mainly clear 🌤️", 2: "Partly cloudy ⛅", 3: "Overcast ☁️",
  45: "Fog 🌫️", 48: "Depositing rime fog ❄️🌫️", 51: "Light drizzle 🌧️", 53: "Moderate drizzle 🌧️", 55: "Dense drizzle 🌧️",
  56: "Light freezing drizzle ❄️🌧️", 57: "Dense freezing drizzle ❄️🌧️", 61: "Slight rain ☔", 63: "Moderate rain ☔", 65: "Heavy rain ☔☔",
  66: "Light freezing rain ❄️☔", 67: "Heavy freezing rain ❄️☔", 71: "Slight snow fall ❄️", 73: "Moderate snow fall ❄️", 75: "Heavy snow fall ❄️❄️",
  77: "Snow grains ❄️", 80: "Slight rain showers 🌦️", 81: "Moderate rain showers 🌦️", 82: "Violent rain showers ⛈️",
  85: "Slight snow showers 🌨️", 86: "Heavy snow showers 🌨️❄️", 95: "Thunderstorm ⛈️", 96: "Thunderstorm with slight hail ⛈️🌨️", 99: "Thunderstorm with heavy hail ⛈️🌨️"
};

const tooltip = d3.select("body").append("div").attr("class", "tooltip");

document.getElementById("citySelect").addEventListener("change", function () {
  const city = this.value;
  updateCharts(city);
  updateHourlySlider(city);
});

updateCharts("Toronto");
updateHourlySlider("Toronto");

// -------- Main Chart Update Function -----------
function updateCharts(cityName) {
  const { lat, lon } = cities[cityName];
  const dailyURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
  const hourlyURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&timezone=auto`;

  Promise.all([
    fetch(dailyURL).then(res => res.json()),
    fetch(hourlyURL).then(res => res.json())
  ]).then(([dailyData, hourlyData]) => {
    const tempMax = dailyData.daily.temperature_2m_max;
    const tempMin = dailyData.daily.temperature_2m_min;
    const weatherCodes = dailyData.daily.weathercode;
    const dates = dailyData.daily.time.map(d => new Date(d));
    const combinedTemps = dates.map((date, i) => ({
      date,
      max: tempMax[i],
      min: tempMin[i]
    }));

    const hourlyTemps = hourlyData.hourly.temperature_2m.map((temp, i) => ({
      time: new Date(hourlyData.hourly.time[i]),
      temp
    }));

    d3.select("#parv-hourly-temp-chart").html("");
    d3.select("#parv-tempRangeChart").html("");
    d3.select("#parv-pieChart").html("");

    drawHourlyChart(hourlyTemps);
    drawTempRangeBarChart(combinedTemps);
    drawPieChart(weatherCodes);
  });
}

// ----------- Hourly Slider Tiles Function --------
function updateHourlySlider(cityName) {
  const { lat, lon } = cities[cityName];
  const hourlyURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode&forecast_days=2&timezone=auto`;

  fetch(hourlyURL)
    .then(res => res.json())
    .then(data => {
      const temps = data.hourly.temperature_2m;
      const codes = data.hourly.weathercode;
      const times = data.hourly.time.map(t => new Date(t));
      const container = document.getElementById("parv-hourly-slider");
      container.innerHTML = "";

      for (let i = 0; i < temps.length; i++) {
        const timeStr = times[i].toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = times[i].toLocaleDateString([], { weekday: 'short' });
        const code = codes[i];
        const meaning = weatherCodeMeanings[code] || `Code ${code}`;
        const temp = temps[i];

        const card = document.createElement("div");
        card.className = "parv-hour-tile";
        card.innerHTML = `
          <p class="tile-time">${dateStr} ${timeStr}</p>
          <p class="tile-temp">${temp}°C</p>
          <p class="tile-desc">${meaning}</p>
        `;
        container.appendChild(card);
      }
    });
}

// ---------- Hourly Line Chart ----------
function drawHourlyChart(data) {
  const margin = { top: 30, right: 30, bottom: 50, left: 50 }, width = 600, height = 300;
  const svg = d3.select("#parv-hourly-temp-chart")
    .append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime().domain(d3.extent(data, d => d.time)).range([0, width]);
  const y = d3.scaleLinear().domain([d3.min(data, d => d.temp) - 2, d3.max(data, d => d.temp) + 2]).range([height, 0]);

  svg.append("g").attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.timeFormat("%a %H:%M")))
    .selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");

  svg.append("g").call(d3.axisLeft(y));

  const line = d3.line().x(d => x(d.time)).y(d => y(d.temp));
  svg.append("path").datum(data).attr("fill", "none").attr("stroke", "#1e88e5").attr("stroke-width", 2).attr("d", line);

  svg.selectAll("circle").data(data).enter().append("circle")
    .attr("cx", d => x(d.time)).attr("cy", d => y(d.temp)).attr("r", 3).attr("fill", "#1e88e5")
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`${d.time.toLocaleString()}<br>Temp: ${d.temp}°C`)
        .style("left", event.pageX + "px").style("top", event.pageY - 30 + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
}

// -------- Bar Chart ----------
function drawTempRangeBarChart(data) {
  const margin = { top: 30, right: 30, bottom: 40, left: 50 }, width = 600, height = 300;
  const svg = d3.select("#parv-tempRangeChart").append("svg")
    .attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom)
    .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(data.map(d => d.date.toDateString())).range([0, width]).padding(0.2);
  const y = d3.scaleLinear().domain([d3.min(data, d => d.min) - 2, d3.max(data, d => d.max) + 2]).range([height, 0]);

  svg.append("g").attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short' })));

  svg.append("g").call(d3.axisLeft(y));

  svg.selectAll(".bar").data(data).enter().append("rect")
    .attr("x", d => x(d.date.toDateString())).attr("y", d => y(d.max))
    .attr("height", d => y(d.min) - y(d.max)).attr("width", x.bandwidth())
    .attr("fill", "#ff7043")
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`${d.date.toDateString()}<br>Min: ${d.min}°C<br>Max: ${d.max}°C`)
        .style("left", event.pageX + "px").style("top", event.pageY - 30 + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
}

// ---------- Pie Chart --------
function drawPieChart(codes) {
  const counts = {};
  codes.forEach(c => counts[c] = (counts[c] || 0) + 1);
  const formatted = Object.entries(counts).map(([code, count]) => ({
    label: weatherCodeMeanings[code] || `Unknown (${code})`, value: count
  }));

  const width = 600, height = 300, radius = 120;
  const svg = d3.select("#parv-pieChart").append("svg")
    .attr("width", width).attr("height", height)
    .append("g").attr("transform", `translate(${width / 2},${height / 2})`);

  const color = d3.scaleOrdinal().domain(formatted.map(d => d.label)).range(d3.schemeSet2);
  const pie = d3.pie().value(d => d.value);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);

  svg.selectAll("path").data(pie(formatted)).enter().append("path")
    .attr("d", arc).attr("fill", d => color(d.data.label))
    .on("mouseover", function (event, d) {
      const percent = ((d.data.value / d3.sum(formatted, d => d.value)) * 100).toFixed(1);
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`<strong>${d.data.label}</strong><br>${percent}% of week`)
        .style("left", event.pageX + "px").style("top", event.pageY - 30 + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
}
