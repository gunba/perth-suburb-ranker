<template>
  <div id="app">
    <!-- Sidebar with controls -->
    <div id="sidebar">
      <!-- Checkbox to toggle suburb boundaries -->
      <label>
        <input type="checkbox" v-model="showSuburbs" @change="toggleSuburbs" />
        Show Suburb Boundaries
      </label>
      <!-- Radio buttons for selecting features to display -->
      <label v-for="(feature, index) in features" :key="index">
        <input
          type="radio"
          :value="index"
          v-model="selectedFeature"
          @change="updateFeature"
        />
        {{ feature.label }}
      </label>
    </div>
    <!-- Container for the map -->
    <div id="map-container"></div>
  </div>
</template>

<style>
#app {
  display: flex;
}

#sidebar {
  width: 300px;
  padding: 10px;
  background: #f7f7f7;
  border-right: 1px solid #ddd;
}

#sidebar label {
  display: block; /* Ensure each checkbox is on a new line */
  margin-bottom: 5px;
}

#map-container {
  height: 100vh;
  width: calc(100% - 300px);
}

.suburb-label {
  font-size: 14px;
  font-family: 'Arial, Helvetica, sans-serif';
  color: #000;
  background: #fff;
  border: 1px solid #ccc;
  padding: 2px;
}

path.leaflet-interactive:focus {
  outline: none;
}

.leaflet-container .greyscale {
  filter: grayscale(100%);
}

.leaflet-top.leaflet-left {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.leaflet-control-zoom {
  margin-right: 120px; /* Adjust as needed for spacing between controls and legend */
}

.info.legend {
  background: white;
  padding: 6px 8px;
  font:
    14px/16px Arial,
    Helvetica,
    sans-serif;
  border-radius: 10px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
  transform: translateX(-50%); /* Center alignment correction */
  z-index: 1000; /* Ensure it appears above other elements */
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 220px; /* Set the minimum width for the legend */
  min-height: 52px;
}

.info.legend .title {
  font-weight: bold;
  font-size: 16px; /* Adjust the font size as needed */
  color: #333; /* Adjust the color as needed */
}

.info.legend .gradient-container {
  width: 100%;
  display: flex;
  align-items: center;
  margin-top: 10px;
}

.info.legend .gradient-bar {
  flex-grow: 1;
  height: 20px;
  background: linear-gradient(
    to right,
    yellow,
    red
  ); /* Adjust colors as needed */
  margin: 0 10px;
}

.info.legend .min-value {
  font-size: 12px;
  color: #333;
}

.info.legend .max-value {
  font-size: 12px;
  color: #333;
}
</style>

<script>
import L from 'leaflet' // Importing Leaflet library for map functionality
import 'leaflet/dist/leaflet.css' // Importing Leaflet CSS for styling
import JSZip from 'jszip' // Importing JSZip library for handling ZIP files
import { toRaw } from 'vue' // Importing toRaw utility from Vue.js

let map // Declare the map variable

export default {
  data() {
    return {
      geojsonLayer: null, // Layer to hold GeoJSON data
      showSuburbs: true, // Flag to show/hide suburb boundaries
      selectedSuburb: null, // Currently selected suburb
      suburbData: null, // Data for all suburbs
      selectedFeature: null, // Currently selected feature
      averages: {}, // Object to hold average values for features
      ranks: {}, // Object to hold rank values for features
      // Define the Feature Object
      features: [
        {
          name: 'crimePerCapita',
          label: 'Crime per capita',
          calc: (props) =>
            (props.wapol_total_person_crime +
              props.wapol_total_property_crime) /
            props.abs_people,
          minColor: '#004085',
          maxColor: '#cce5ff',
        },
        {
          name: 'crimeTrend',
          label: 'Crime trend',
          calc: (props) =>
            (props.wapol_total_person_crime +
              props.wapol_total_property_crime) /
            (props.wapol_avg_person_crime_prev_3y +
              props.wapol_avg_property_crime_prev_3y),
          minColor: '#004085',
          maxColor: '#cce5ff',
        },
        {
          name: 'populationDensity',
          label: 'Population density',
          calc: (props) => props.abs_people / props.abs_area_km2,
          minColor: '#f03b20',
          maxColor: '#ffeda0',
        },
        {
          name: 'genderRatio',
          label: 'Gender ratio',
          calc: (props) => props.abs_male_ratio,
          minColor: '#b22200',
          maxColor: '#ffebcc',
        },
        {
          name: 'medianAge',
          label: 'Median age',
          calc: (props) => props.abs_median_age,
          minColor: '#005824',
          maxColor: '#e7f2e9',
        },
        {
          name: 'medianIncome',
          label: 'Median income',
          calc: (props) => props.abs_median_weekly_household_income,
          minColor: '#08306b',
          maxColor: '#e0ecf4',
        },
        {
          name: 'australianBorn',
          label: 'Australian born',
          calc: (props) =>
            props.abs_sub_country_of_birth_top_responses_australia_pct,
          minColor: '#2a004e',
          maxColor: '#ece7f2',
        },
        {
          name: 'englishAtHome',
          label: 'Only English used at home',
          calc: (props) =>
            props.abs_sub_language_used_at_home_top_responses_english_only_used_at_home_pct,
          minColor: '#08306b',
          maxColor: '#deebf7',
        },
        {
          name: 'labourForce',
          label: 'Participation in labour force',
          calc: (props) =>
            props.abs_sub_participation_in_the_labour_force_in_the_labour_force_pct,
          minColor: '#d7301f',
          maxColor: '#fff5eb',
        },
        {
          name: 'homeOwnership',
          label: 'Home ownership',
          calc: (props) => props.abs_sub_tenure_type_owned_outright_pct,
          minColor: '#b30000',
          maxColor: '#fef0d9',
        },
        {
          name: 'medianHousePrice',
          label: 'Median house price',
          calc: (props) => props.reiwa_median_house_sale,
          minColor: '#54278f',
          maxColor: '#f2f0f7',
        },
        {
          name: 'salesGrowth',
          label: 'Suburb sales growth',
          calc: (props) => props.reiwa_sales_growth,
          minColor: '#980043',
          maxColor: '#fdd0a2',
        },
        {
          name: 'suburbInterest',
          label: 'Suburb interest level',
          calc: (props) => props.reiwa_suburb_interest_level,
          minColor: '#7a0177',
          maxColor: '#f7f4f9',
        },
      ],
    }
  },

  mounted() {
    this.loadZipData() // Load the ZIP data when the component is mounted
  },

  methods: {
    // Method to load ZIP data
    async loadZipData() {
      const response = await fetch('data.zip') // Fetch the ZIP file
      const blob = await response.blob() // Convert the response to a blob
      const zip = await JSZip.loadAsync(blob) // Load the blob as a ZIP file

      const suburbDataFile = await zip.file('suburb_data.json').async('string') // Extract the JSON file from the ZIP
      this.suburbData = JSON.parse(suburbDataFile) // Parse the JSON file and store it in suburbData

      this.calculateAveragesAndRanks() // Calculate averages for features Calculate ranks for features
      this.initMap() // Initialize the map
    },

    // Method to initialize the map
    initMap() {
      map = L.map('map-container').setView([-31.9505, 115.8605], 13) // Create the map centered on specified coordinates
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        className: 'greyscale', // Greyscale the map tiles
      }).addTo(map)

      const geojsonData = this.convertToGeoJSON(this.suburbData) // Convert suburb data to GeoJSON format
      this.geojsonLayer = L.geoJSON(geojsonData, {
        onEachFeature: (feature, layer) => {
          layer.on({
            click: this.onSuburbClick, // Click event handler
            mouseover: this.onSuburbMouseover, // Mouseover event handler
            mouseout: this.onSuburbMouseout, // Mouseout event handler
          })
        },
        style: () => ({ fillOpacity: 0, color: 'blue', weight: 1 }), // Style for the GeoJSON layer
      }).addTo(toRaw(map))
    },

    // Method to convert suburb data to GeoJSON format
    convertToGeoJSON(suburbData) {
      const geoFeatures = Object.keys(suburbData).map((key) => {
        const coordinates = suburbData[key].abs_coordinates.map((coords) =>
          coords.map(([lng, lat]) => [lng, lat])
        )

        return {
          type: 'Feature',
          properties: {
            name: key,
            ...suburbData[key],
          },
          geometry: {
            type: 'Polygon',
            coordinates,
          },
        }
      })

      return {
        type: 'FeatureCollection',
        features: geoFeatures,
      }
    },

    // Method to toggle the display of suburb boundaries
    toggleSuburbs() {
      this.selectedFeature = null
      if (this.legend) {
        map.removeControl(this.legend)
      }
      if (this.showSuburbs) {
        this.geojsonLayer.setStyle({
          fillOpacity: 0,
          color: 'blue',
          weight: 1,
        })
      } else {
        this.geojsonLayer.setStyle({
          fillOpacity: 0,
          color: 'blue',
          weight: 0,
        })
      }
    },

    // Method to handle suburb click event
    onSuburbClick(e) {
      const layer = e.target

      // Check if there is a previously selected suburb and reset its style
      if (this.selectedSuburb) {
        this.selectedSuburb.setStyle({ color: '', weight: 0 })
      }

      // Set the style for the newly selected suburb
      layer.setStyle({ color: 'red', weight: 5 })

      // Update the selectedSuburb reference
      this.selectedSuburb = layer
    },

    resetSuburbStyle(layer) {
      if (this.showSuburbs) {
        layer.setStyle({ fillOpacity: 0 })
      }
    },

    // Method to handle suburb mouseover event
    // Method to handle suburb mouseover event
    // Method to handle suburb mouseover event
    onSuburbMouseover(e) {
      const layer = e.target
      const props = layer.feature.properties
      const featureIndex = this.selectedFeature

      if (featureIndex === null || featureIndex === undefined) {
        layer
          .bindTooltip(`${props.name}`, {
            permanent: false,
            direction: 'center',
            className: 'suburb-label',
          })
          .openTooltip()
        return
      }

      const feature = this.features[featureIndex]
      const value = feature.calc(props)
      const rank = this.ranks[feature.name][props.name]

      if (value !== null && !Number.isNaN(value)) {
        layer
          .bindTooltip(
            `${props.name}. ${feature.label}: ${value.toFixed(2)} (Rank: ${rank})`,
            {
              permanent: false,
              direction: 'center',
              className: 'suburb-label',
            }
          )
          .openTooltip()
      } else {
        // Handle the case where value is not a number
        layer
          .bindTooltip(`${props.name}. ${feature.label}: N/A (Rank: ${rank})`, {
            permanent: false,
            direction: 'center',
            className: 'suburb-label',
          })
          .openTooltip()
      }
    },

    // Method to calculate average values for features
    calculateAveragesAndRanks() {
      const totals = this.features.reduce((acc, feature) => {
        acc[feature.name] = 0
        return acc
      }, {})

      const featureValues = this.features.reduce((acc, feature) => {
        acc[feature.name] = []
        return acc
      }, {})

      let count = 0

      Object.entries(this.suburbData).forEach(([key, data]) => {
        this.features.forEach((feature) => {
          const value = feature.calc(data)
          totals[feature.name] += value
          featureValues[feature.name].push({
            name: key,
            value,
          })
        })
        count += 1
      })

      this.averages = this.features.reduce((acc, feature) => {
        acc[feature.name] = totals[feature.name] / count
        return acc
      }, {})

      this.features.forEach((feature) => {
        featureValues[feature.name].sort((a, b) => b.value - a.value)
        this.ranks[feature.name] = {}
        featureValues[feature.name].forEach((item, index) => {
          this.ranks[feature.name][item.name] = index + 1
        })
      })
    },

    // Method to update the feature displayed on the map
    updateFeature() {
      this.showSuburbs = false
      const featureIndex = this.selectedFeature

      if (featureIndex === null) {
        this.geojsonLayer.setStyle(() => ({ fillOpacity: 0 }))
        return
      }

      const feature = this.features[featureIndex]
      const featureRanks = this.ranks[feature.name]

      if (!featureRanks) {
        console.error(`No data available for feature: ${feature.name}`)
        return
      }

      const min = Math.min(...Object.values(featureRanks))
      const max = Math.max(...Object.values(featureRanks))
      const { minColor, maxColor } = feature

      const getColor = (value) => {
        const valueRatio = (value - min) / (max - min)
        const interpolate = (start, end, ratio) =>
          Math.round(start + (end - start) * ratio)
        const r = interpolate(
          parseInt(minColor.slice(1, 3), 16),
          parseInt(maxColor.slice(1, 3), 16),
          valueRatio
        )
        const g = interpolate(
          parseInt(minColor.slice(3, 5), 16),
          parseInt(maxColor.slice(3, 5), 16),
          valueRatio
        )
        const b = interpolate(
          parseInt(minColor.slice(5, 7), 16),
          parseInt(maxColor.slice(5, 7), 16),
          valueRatio
        )
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      }

      this.geojsonLayer.eachLayer((layer) => {
        const props = layer.feature.properties
        const rank = featureRanks[props.name]

        if (rank !== undefined) {
          layer.setStyle({
            fillColor: getColor(rank),
            fillOpacity: 0.7,
            color: 'none',
          })
        } else {
          layer.setStyle({
            fillOpacity: 0,
            color: 'none',
          })
        }
      })

      this.updateLegend(min, max, minColor, maxColor, feature.label)
    },

    // Method to update the legend on the map
    updateLegend(min, max, lowColor, highColor, featureLabel) {
      const createLegend = () => {
        const div = L.DomUtil.create('div', 'info legend')

        // Create the title div
        const titleDiv = L.DomUtil.create('div', 'title', div)
        titleDiv.innerText = featureLabel // Set the title text

        // Create the gradient bar container
        const gradientContainer = L.DomUtil.create(
          'div',
          'gradient-container',
          div
        )

        // Create labels for the min and max values
        const minValueLabel = L.DomUtil.create(
          'div',
          'min-value',
          gradientContainer
        )
        minValueLabel.innerText = min

        // Create the gradient bar
        const gradientBar = L.DomUtil.create('div', 'gradient-bar')
        gradientBar.style.background = `linear-gradient(to right, ${lowColor}, ${highColor})` // Set gradient colors
        gradientContainer.appendChild(gradientBar)

        const maxValueLabel = L.DomUtil.create(
          'div',
          'max-value',
          gradientContainer
        )
        maxValueLabel.innerText = max
        return div
      }

      if (this.legend) {
        map.removeControl(this.legend)
      }

      this.legend = L.control({ position: 'topleft' })
      this.legend.onAdd = createLegend
      this.legend.addTo(map)
    },
  },
}
</script>
