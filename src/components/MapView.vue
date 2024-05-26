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
      <div
        v-for="(feature, index) in predefinedFeatures"
        :key="index"
        class="form-check"
      >
        <input
          type="radio"
          :value="feature.key"
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
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import JSZip from 'jszip'
import { toRaw } from 'vue'

let map

export default {
  data() {
    return {
      geojsonLayer: null,
      showSuburbs: true,
      selectedSuburb: null,
      suburbData: null,
      selectedFeature: null,
      selectedDynamicFeature: null,
      allFeatureLabels: {},
      predefinedFeatures: [
        { key: 'crimePerCapita', label: 'Crime per capita' },
        { key: 'populationDensity', label: 'Population density' },
        { key: 'medianIncome', label: 'Median income' },
      ],
      featureRanks: {}, // Added to store precomputed ranks
    }
  },

  mounted() {
    this.loadZipData()
  },

  methods: {
    async loadZipData() {
      const response = await fetch('data.zip')
      const blob = await response.blob()
      const zip = await JSZip.loadAsync(blob)

      const suburbDataFile = await zip.file('suburb_data.json').async('string')
      this.suburbData = JSON.parse(suburbDataFile)

      // Exclude Kings Park
      delete this.suburbData['Kings Park']

      this.calculatePredefinedFeatures()
      this.populateFeatureLabels()
      this.precomputeFeatureRanks() // Precompute ranks
      this.initMap()
    },

    initMap() {
      map = L.map('map-container').setView([-31.9505, 115.8605], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        className: 'greyscale',
      }).addTo(map)

      const geojsonData = this.convertToGeoJSON(this.suburbData)
      this.geojsonLayer = L.geoJSON(geojsonData, {
        onEachFeature: (feature, layer) => {
          layer.on({
            click: this.onSuburbClick,
            mouseover: this.onSuburbMouseover,
            mouseout: this.onSuburbMouseout,
          })
        },
        style: () => ({ fillOpacity: 0, color: 'blue', weight: 1 }),
      }).addTo(toRaw(map))
    },

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

    toggleSuburbs() {
      this.selectedFeature = null
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

    onSuburbClick(e) {
      const layer = e.target

      if (this.selectedSuburb) {
        this.selectedSuburb.setStyle({ color: '', weight: 0 })
      }

      layer.setStyle({ color: 'red', weight: 5 })

      this.selectedSuburb = layer
    },

    onSuburbMouseover(e) {
      const layer = e.target
      const props = layer.feature.properties
      const featureKey = this.selectedFeature || this.selectedDynamicFeature

      if (!featureKey) {
        this.showTooltip(layer, `${props.name}`)
        return
      }

      const value = props[featureKey]
      const rank = this.featureRanks[featureKey][props.name]

      if (value === undefined) {
        return
      }

      const rankColor = this.getRankColor(rank)
      const totalSuburbs = Object.keys(this.featureRanks[featureKey]).length
      const percentile = ((totalSuburbs - rank + 1) / totalSuburbs) * 100

      this.showTooltip(
        layer,
        `<strong>${props.name}</strong><br>${this.getFeatureLabel(featureKey)}: ${this.formatValue(value)}<br><span style="color: ${rankColor};">%ile: ${percentile.toFixed(2)} (Rank: ${rank})</span>`
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
      if (value === null || Number.isNaN(value)) return 'N/A'
      if (value >= 1000) return value.toFixed(0)
      if (value >= 1) return value.toFixed(2)
      return value.toFixed(4)
    },

    calculatePredefinedFeatures() {
      Object.keys(this.suburbData).forEach((key) => {
        const data = this.suburbData[key]
        this.suburbData[key].crimePerCapita =
          (data.wapol_total_person_crime + data.wapol_total_property_crime) /
          data.abs_people
        this.suburbData[key].populationDensity =
          data.abs_people / data.abs_area_km2
        this.suburbData[key].medianIncome =
          data.abs_median_weekly_household_income
      })
    },

    precomputeFeatureRanks() {
      this.featureRanks = this.predefinedFeatures.reduce((acc, feature) => {
        acc[feature.key] = this.calculateRanks(feature.key)
        return acc
      }, {})

      // Add dynamic features if needed
      Object.keys(this.suburbData[Object.keys(this.suburbData)[0]]).forEach(
        (key) => {
          if (!this.featureRanks[key]) {
            this.featureRanks[key] = this.calculateRanks(key)
          }
        }
      )
    },

    calculateRanks(featureKey) {
      const featureValues = Object.entries(this.suburbData)
        .filter(([, data]) => data[featureKey] !== undefined)
        .map(([key, data]) => ({
          name: key,
          value: data[featureKey],
        }))

      featureValues.sort((a, b) => b.value - a.value)

      const ranks = {}
      featureValues.forEach((item, index) => {
        ranks[item.name] = index + 1
      })

      return ranks
    },

    updateFeature() {
      this.showSuburbs = false
      this.updateFeatureDisplay(this.selectedFeature)
    },

    updateDynamicFeature() {
      this.selectedFeature = null
      this.updateFeatureDisplay(this.selectedDynamicFeature)
    },

    updateFeatureDisplay(featureKey) {
      if (!featureKey) {
        this.geojsonLayer.setStyle(() => ({ fillOpacity: 0 }))
        return
      }

      const featureRanks = this.featureRanks[featureKey]

      if (!featureRanks) {
        console.error(`No data available for feature: ${featureKey}`)
        return
      }

      const suburbValues = Object.values(this.suburbData)
        .map((d) => d[featureKey])
        .filter((value) => value !== undefined)

      const min = Math.min(...suburbValues)
      const max = Math.max(...suburbValues)
      const avg = suburbValues.reduce((a, b) => a + b, 0) / suburbValues.length

      const totalSuburbs = Object.keys(this.featureRanks[featureKey]).length
      const minColor = '#cce5ff' // Light color
      const maxColor = '#004085' // Dark color

      const getColor = (percentile) => {
        const valueRatio = percentile / 100
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
          const percentile = ((totalSuburbs - rank + 1) / totalSuburbs) * 100
          layer.setStyle({
            fillColor: getColor(percentile),
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

      const featureSuburbsCount = suburbValues.length

      this.updateLegend(
        min,
        max,
        avg,
        minColor,
        maxColor,
        this.getFeatureLabel(featureKey),
        featureSuburbsCount
      )
    },

    updateLegend(
      minValue,
      maxValue,
      avgValue,
      lowColor,
      highColor,
      featureLabel,
      count
    ) {
      const createLegend = () => {
        const div = L.DomUtil.create('div', 'info legend')

        const titleDiv = L.DomUtil.create('div', 'title', div)
        titleDiv.innerHTML = `${featureLabel} <br>(${count} suburbs, Avg: ${this.formatValue(avgValue)})`

        const gradientContainer = L.DomUtil.create(
          'div',
          'gradient-container',
          div
        )

        const minValueLabel = L.DomUtil.create(
          'div',
          'min-value',
          gradientContainer
        )
        minValueLabel.innerText = this.formatValue(minValue)

        const gradientBar = L.DomUtil.create('div', 'gradient-bar')
        gradientBar.style.background = `linear-gradient(to right, ${lowColor}, ${highColor})`
        gradientContainer.appendChild(gradientBar)

        const maxValueLabel = L.DomUtil.create(
          'div',
          'max-value',
          gradientContainer
        )
        maxValueLabel.innerText = this.formatValue(maxValue)

        return div
      }

      if (this.legend) {
        map.removeControl(this.legend)
      }

      this.legend = L.control({ position: 'topleft' })
      this.legend.onAdd = createLegend
      this.legend.addTo(map)
    },

    populateFeatureLabels() {
      this.allFeatureLabels = {}
      const sampleSuburb = Object.values(this.suburbData)[0]
      if (sampleSuburb) {
        Object.keys(sampleSuburb).forEach((key) => {
          if (!this.predefinedFeatures.some((feature) => feature.key === key)) {
            this.allFeatureLabels[key] = key
          }
        })
      }
    },

    getFeatureLabel(featureKey) {
      const predefinedFeature = this.predefinedFeatures.find(
        (feature) => feature.key === featureKey
      )
      return predefinedFeature
        ? predefinedFeature.label
        : this.allFeatureLabels[featureKey]
    },

    getRankColor(rank) {
      const totalRanks = Object.keys(this.suburbData).length
      const percentile = ((totalRanks - rank + 1) / totalRanks) * 100
      if (percentile === 100) return '#e5cc80' // 100 percentile
      if (percentile >= 99) return '#e268a8' // Sub 100 percentile
      if (percentile >= 95) return '#ff8000' // Sub 99 percentile
      if (percentile >= 75) return '#a335ee' // Sub 95 percentile
      if (percentile >= 50) return '#0070ff' // Sub 75 percentile
      if (percentile >= 25) return '#1eff00' // Sub 50 percentile
      return '#666' // Sub 25 percentile
    },
  },
}
</script>
