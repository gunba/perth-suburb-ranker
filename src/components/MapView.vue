<template>
  <div id="app">
    <div id="sidebar" class="p-3 transition">
      <div class="form-check">
        <input
          type="checkbox"
          class="form-check-input"
          v-model="showSuburbs"
          @change="toggleSuburbs"
          id="showSuburbsCheckbox"
        />
        <label class="form-check-label" for="showSuburbsCheckbox"
          >Show Suburb Boundaries</label
        >
      </div>
      <div v-for="(feature, index) in features" :key="index" class="form-check">
        <input
          type="radio"
          :value="index"
          v-model="selectedFeature"
          @change="updateFeature"
          class="form-check-input"
          :id="`feature${index}`"
        />
        <label class="form-check-label" :for="`feature${index}`">{{
          feature.label
        }}</label>
      </div>
      <div class="select-container mt-3">
        <label for="dynamicFeatureSelect">
          Select raw feature:
          <select
            class="form-select"
            v-model="selectedDynamicFeature"
            @change="updateDynamicFeature"
            id="dynamicFeatureSelect"
          >
            <option
              v-for="(featureLabel, featureKey) in allFeatureLabels"
              :key="featureKey"
              :value="featureKey"
            >
              {{ featureLabel }}
            </option>
          </select>
        </label>
      </div>
    </div>
    <div id="map-container"></div>
  </div>
</template>

<style>
@import 'bootstrap/dist/css/bootstrap.min.css';
@import 'bootswatch/dist/darkly/bootstrap.min.css';
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&family=Roboto:wght@400;700&display=swap');

/* Global Styles */
body {
  font-family: 'Open Sans', sans-serif;
  background-color: #343a40;
  color: #f8f9fa;
  margin: 0;
}

#app {
  display: flex;
}

#sidebar {
  width: 300px;
  padding: 20px;
  background: #495057;
  border-right: 1px solid #6c757d;
  overflow-y: auto;
}

#sidebar label {
  display: block;
  margin-bottom: 10px;
  cursor: pointer;
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  font-weight: 600;
}

.select-container {
  margin-top: 20px;
}

.select-container label {
  display: flex;
  flex-direction: column;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
  font-family: 'Roboto', sans-serif;
}

.select-container select {
  width: 100%;
  max-width: 250px; /* Adjusted width */
  padding: 8px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #6c757d;
  color: #f8f9fa;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  appearance: none;
  transition:
    border-color 0.3s,
    box-shadow 0.3s;
}

.select-container select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
}

.form-check-input {
  margin-right: 10px;
  cursor: pointer;
}

#map-container {
  height: 100vh;
  width: calc(100% - 300px);
}

.suburb-label {
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  color: #f8f9fa;
  background: #343a40;
  border: 1px solid #ccc;
  padding: 5px;
  border-radius: 4px;
}

path.leaflet-interactive:focus {
  outline: none;
}

.leaflet-container .greyscale {
  filter: grayscale(100%);
}

.leaflet-top.leaflet-left {
  top: 10px !important; /* Adjust positioning as needed */
  left: 10px !important; /* Ensure the controls are not hidden */
  z-index: 1000; /* Ensure the controls stay above other elements */
}

.leaflet-control-zoom {
  display: flex;
  flex-direction: column;
  position: relative; /* Ensure it stays within the map container */
  margin-bottom: 50px; /* Add margin to avoid overlap with legend */
}

.leaflet-control-zoom-in,
.leaflet-control-zoom-out {
  width: 30px;
  height: 30px;
  background-color: #495057;
  color: #f8f9fa;
  border: 1px solid #6c757d;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  transition:
    background-color 0.3s,
    color 0.3s;
}

.leaflet-control-zoom-in:hover,
.leaflet-control-zoom-out:hover {
  background-color: #007bff;
  color: #fff;
}

.info.legend {
  position: absolute; /* Ensure it stays within the map container */
  top: 0px; /* Adjust to avoid overlap with zoom controls */
  left: 50px; /* Adjust as needed */
  background: #495057;
  padding: 10px;
  font:
    14px/16px 'Roboto',
    sans-serif;
  border-radius: 10px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 230px;
  min-height: 52px;
}

.info.legend .title {
  font-weight: bold;
  font-size: 16px;
  color: #f8f9fa;
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
  background: linear-gradient(to right, yellow, red);
  margin: 0 10px;
}

.info.legend .min-value {
  font-size: 12px;
  color: #f8f9fa;
}

.info.legend .max-value {
  font-size: 12px;
  color: #f8f9fa;
}

::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-thumb {
  background: #6c757d;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}

::-webkit-scrollbar-track {
  background: #495057;
}

.transition {
  transition: all 0.3s ease;
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
      selectedDynamicFeature: null, // Currently selected dynamic feature
      allFeatureLabels: {}, // Labels for all features
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
      this.populateFeatureLabels() // Populate feature labels dropdown
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
    onSuburbMouseover(e) {
      const layer = e.target
      const props = layer.feature.properties
      const featureIndex = this.selectedFeature
      const dynamicFeature = this.selectedDynamicFeature

      if (featureIndex === null && !dynamicFeature) {
        this.showTooltip(layer, `${props.name}`)
        return
      }

      let feature
      let value
      let rank
      if (featureIndex !== null) {
        feature = this.features[featureIndex]
        value = feature.calc(props)
        rank = this.ranks[feature.name][props.name]
      } else {
        feature = {
          name: dynamicFeature,
          label: this.allFeatureLabels[dynamicFeature],
        }
        value = props[dynamicFeature]
        rank = this.calculateDynamicRanks(feature.name)[props.name]
      }

      if (value === undefined) {
        return
      }

      this.showTooltip(
        layer,
        `${props.name}. ${feature.label}: ${this.formatValue(value)} (Rank: ${rank})`
      )
    },

    showTooltip(layer, content) {
      layer
        .bindTooltip(content, {
          permanent: false,
          direction: 'center',
          className: 'suburb-label',
        })
        .openTooltip()
    },

    formatValue(value) {
      return value !== null && !Number.isNaN(value) ? value.toFixed(2) : 'N/A'
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

    calculateDynamicRanks(featureName) {
      const featureValues = Object.entries(this.suburbData)
        .filter(([, data]) => data[featureName] !== undefined) // Filter out undefined values
        .map(([key, data]) => ({
          name: key,
          value: data[featureName],
        }))

      featureValues.sort((a, b) => b.value - a.value)

      const ranks = {}
      featureValues.forEach((item, index) => {
        ranks[item.name] = index + 1
      })

      return ranks
    },

    // Method to update the feature displayed on the map
    updateFeature() {
      this.showSuburbs = false
      const featureIndex = this.selectedFeature

      if (featureIndex === null && !this.selectedDynamicFeature) {
        this.geojsonLayer.setStyle(() => ({ fillOpacity: 0 }))
        return
      }

      let feature
      let featureRanks
      if (featureIndex !== null) {
        feature = this.features[featureIndex]
        featureRanks = this.ranks[feature.name]
      } else {
        feature = {
          name: this.selectedDynamicFeature,
          label: this.allFeatureLabels[this.selectedDynamicFeature],
          calc: (props) => props[this.selectedDynamicFeature],
          minColor: '#004085', // Use default colors or create a dynamic color scheme
          maxColor: '#cce5ff',
        }
        featureRanks = this.calculateDynamicRanks(feature.name)
      }

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

    // Method to update dynamic feature
    updateDynamicFeature() {
      this.selectedFeature = null
      this.updateFeature()
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

    // Create dynamic feature labels based on suburb data
    populateFeatureLabels() {
      this.allFeatureLabels = {}
      const sampleSuburb = Object.values(this.suburbData)[0]
      if (sampleSuburb) {
        Object.keys(sampleSuburb).forEach((key) => {
          if (!this.features.some((feature) => feature.name === key)) {
            this.allFeatureLabels[key] = key // Directly use the key as the label
          }
        })
      }
    },
  },
}
</script>
