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
      <label v-for="(label, index) in featureLabels" :key="index">
        <input
          type="radio"
          :value="index"
          v-model="selectedFeature"
          @change="updateFeature"
        />
        {{ label }}
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
      featureLabels: [
        // Labels for the features to display
        'Crime per capita',
        'Crime trend',
        'Population density',
        'Gender ratio',
        'Median age',
        'Median income',
        'Australian born',
        'Only English used at home',
        'Participation in labour force',
        'Home ownership',
        'Median house price',
        'Suburb sales growth',
        'Suburb interest level',
      ],
      averages: {}, // Object to hold average values for features
      ranks: {}, // Object to hold rank values for features
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

      this.calculateAverages() // Calculate averages for features
      this.calculateRanks() // Calculate ranks for features
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
        style: () => ({ color: '#3388ff', weight: 3, fillOpacity: 0 }), // Style for the GeoJSON layer
      }).addTo(toRaw(map))
    },

    // Method to convert suburb data to GeoJSON format
    convertToGeoJSON(suburbData) {
      const features = Object.keys(suburbData).map((key) => {
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
        features,
      }
    },

    // Method to toggle the display of suburb boundaries
    toggleSuburbs() {
      this.selectedFeature = null
      if (this.showSuburbs) {
        this.geojsonLayer.setStyle({
          fillOpacity: 0,
        })
      } else {
        this.geojsonLayer.setStyle({ fillOpacity: 0 })
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

      // Check if a feature is selected
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

      let value
      let rank

      // Determine the value and rank based on the selected feature
      switch (featureIndex) {
        case 0:
          value =
            (props.wapol_total_person_crime +
              props.wapol_total_property_crime) /
            props.abs_people
          rank = this.ranks.crimePerCapita[props.name]
          break
        case 1:
          value =
            (props.wapol_total_person_crime +
              props.wapol_total_property_crime) /
            (props.wapol_avg_person_crime_prev_3y +
              props.wapol_avg_property_crime_prev_3y)
          rank = this.ranks.crimeTrend[props.name]
          break
        case 2:
          value = props.abs_people / props.abs_area_km2
          rank = this.ranks.populationDensity[props.name]
          break
        case 3:
          value = props.abs_male_ratio
          rank = this.ranks.genderRatio[props.name]
          break
        case 4:
          value = props.abs_median_age
          rank = this.ranks.medianAge[props.name]
          break
        case 5:
          value = props.abs_median_weekly_household_income
          rank = this.ranks.medianIncome[props.name]
          break
        case 6:
          value = props.abs_sub_country_of_birth_top_responses_australia_pct
          rank = this.ranks.australianBorn[props.name]
          break
        case 7:
          value =
            props.abs_sub_language_used_at_home_top_responses_english_only_used_at_home_pct
          rank = this.ranks.englishAtHome[props.name]
          break
        case 8:
          value =
            props.abs_sub_participation_in_the_labour_force_in_the_labour_force_pct
          rank = this.ranks.labourForce[props.name]
          break
        case 9:
          value = props.abs_sub_tenure_type_owned_outright_pct
          rank = this.ranks.homeOwnership[props.name]
          break
        case 10:
          value = props.reiwa_median_house_sale
          rank = this.ranks.medianHousePrice[props.name]
          break
        case 11:
          value = props.reiwa_sales_growth
          rank = this.ranks.salesGrowth[props.name]
          break
        case 12:
          value = props.reiwa_suburb_interest_level
          rank = this.ranks.suburbInterest[props.name]
          break
        default:
          value = null
          rank = null
      }

      // Display the tooltip with the suburb name, value, and rank
      if (value !== null) {
        layer
          .bindTooltip(
            `${props.name}. ${this.featureLabels[featureIndex]}: ${value.toFixed(
              2
            )} (Rank: ${rank})`,
            {
              permanent: false,
              direction: 'center',
              className: 'suburb-label',
            }
          )
          .openTooltip()
      }
    },
    // Method to handle suburb mouseout event
    onSuburbMouseout(e) {
      e.target.closeTooltip()
    },
    // Method to calculate average values for features
    calculateAverages() {
      const total = {
        crimePerCapita: 0,
        crimeTrend: 0,
        populationDensity: 0,
        genderRatio: 0,
        medianAge: 0,
        medianIncome: 0,
        australianBorn: 0,
        englishAtHome: 0,
        labourForce: 0,
        homeOwnership: 0,
        medianHousePrice: 0,
        salesGrowth: 0,
        suburbInterest: 0,
      }
      let count = 0

      // Calculate total values for each feature
      Object.values(this.suburbData).forEach((data) => {
        total.crimePerCapita +=
          (data.wapol_total_person_crime + data.wapol_total_property_crime) /
          data.abs_people
        total.crimeTrend +=
          (data.wapol_total_person_crime + data.wapol_total_property_crime) /
          (data.wapol_avg_person_crime_prev_3y +
            data.wapol_avg_property_crime_prev_3y)
        total.populationDensity += data.abs_people / data.abs_area_km2
        total.genderRatio += data.abs_male_ratio
        total.medianAge += data.abs_median_age
        total.medianIncome += data.abs_median_weekly_household_income
        total.australianBorn +=
          data.abs_sub_country_of_birth_top_responses_australia_pct
        total.englishAtHome +=
          data.abs_sub_language_used_at_home_top_responses_english_only_used_at_home_pct
        total.labourForce +=
          data.abs_sub_participation_in_the_labour_force_in_the_labour_force_pct
        total.homeOwnership += data.abs_sub_tenure_type_owned_outright_pct
        total.medianHousePrice += data.reiwa_median_house_sale
        total.salesGrowth += data.reiwa_sales_growth
        total.suburbInterest += data.reiwa_suburb_interest_level
        count += 1
      })

      // Calculate average values for each feature
      this.averages = {
        crimePerCapita: total.crimePerCapita / count,
        crimeTrend: total.crimeTrend / count,
        populationDensity: total.populationDensity / count,
        genderRatio: total.genderRatio / count,
        medianAge: total.medianAge / count,
        medianIncome: total.medianIncome / count,
        australianBorn: total.australianBorn / count,
        englishAtHome: total.englishAtHome / count,
        labourForce: total.labourForce / count,
        homeOwnership: total.homeOwnership / count,
        medianHousePrice: total.medianHousePrice / count,
        salesGrowth: total.salesGrowth / count,
        suburbInterest: total.suburbInterest / count,
      }
    },
    // Method to calculate rank values for features
    calculateRanks() {
      const featureValues = {
        crimePerCapita: [],
        crimeTrend: [],
        populationDensity: [],
        genderRatio: [],
        medianAge: [],
        medianIncome: [],
        australianBorn: [],
        englishAtHome: [],
        labourForce: [],
        homeOwnership: [],
        medianHousePrice: [],
        salesGrowth: [],
        suburbInterest: [],
      }

      // Populate featureValues with data for each feature
      Object.entries(this.suburbData).forEach(([key, data]) => {
        featureValues.crimePerCapita.push({
          name: key,
          value:
            (data.wapol_total_person_crime + data.wapol_total_property_crime) /
            data.abs_people,
        })
        featureValues.crimeTrend.push({
          name: key,
          value:
            (data.wapol_total_person_crime + data.wapol_total_property_crime) /
            (data.wapol_avg_person_crime_prev_3y +
              data.wapol_avg_property_crime_prev_3y),
        })
        featureValues.populationDensity.push({
          name: key,
          value: data.abs_people / data.abs_area_km2,
        })
        featureValues.genderRatio.push({
          name: key,
          value: data.abs_male_ratio,
        })
        featureValues.medianAge.push({ name: key, value: data.abs_median_age })
        featureValues.medianIncome.push({
          name: key,
          value: data.abs_median_weekly_household_income,
        })
        featureValues.australianBorn.push({
          name: key,
          value: data.abs_sub_country_of_birth_top_responses_australia_pct,
        })
        featureValues.englishAtHome.push({
          name: key,
          value:
            data.abs_sub_language_used_at_home_top_responses_english_only_used_at_home_pct,
        })
        featureValues.labourForce.push({
          name: key,
          value:
            data.abs_sub_participation_in_the_labour_force_in_the_labour_force_pct,
        })
        featureValues.homeOwnership.push({
          name: key,
          value: data.abs_sub_tenure_type_owned_outright_pct,
        })
        featureValues.medianHousePrice.push({
          name: key,
          value: data.reiwa_median_house_sale,
        })
        featureValues.salesGrowth.push({
          name: key,
          value: data.reiwa_sales_growth,
        })
        featureValues.suburbInterest.push({
          name: key,
          value: data.reiwa_suburb_interest_level,
        })
      })

      // Calculate ranks for each feature
      Object.keys(featureValues).forEach((feature) => {
        featureValues[feature].sort((a, b) => b.value - a.value)
        this.ranks[feature] = {}
        featureValues[feature].forEach((item, index) => {
          this.ranks[feature][item.name] = index + 1
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

      const featureMap = {
        0: 'crimePerCapita',
        1: 'crimeTrend',
        2: 'populationDensity',
        3: 'genderRatio',
        4: 'medianAge',
        5: 'medianIncome',
        6: 'australianBorn',
        7: 'englishAtHome',
        8: 'labourForce',
        9: 'homeOwnership',
        10: 'medianHousePrice',
        11: 'salesGrowth',
        12: 'suburbInterest',
      }

      const colorScales = [
        ['#004085', '#cce5ff'], // Crime per capita (dark blue to light blue)
        ['#004085', '#cce5ff'], // Crime trend (dark blue to light blue)
        ['#f03b20', '#ffeda0'], // Population density (dark red to light yellow)
        ['#b22200', '#ffebcc'], // Gender ratio (dark red to light orange)
        ['#005824', '#e7f2e9'], // Median age (dark green to light green)
        ['#08306b', '#e0ecf4'], // Median income (dark blue to light blue)
        ['#2a004e', '#ece7f2'], // Australian born (dark purple to light purple)
        ['#08306b', '#deebf7'], // Only English used at home (dark blue to light blue)
        ['#d7301f', '#fff5eb'], // Participation in labour force (dark red to light orange)
        ['#b30000', '#fef0d9'], // Home ownership (dark red to light pink)
        ['#54278f', '#f2f0f7'], // Median house price (dark purple to light purple)
        ['#980043', '#fdd0a2'], // Suburb sales growth (dark pink to light pink)
        ['#7a0177', '#f7f4f9'], // Suburb interest level (dark purple to light purple)
      ]

      const feature = featureMap[featureIndex]
      const featureRanks = this.ranks[feature]

      if (!featureRanks) {
        console.error(`No data available for feature: ${feature}`)
        return
      }

      const min = Math.min(...Object.values(featureRanks))
      const max = Math.max(...Object.values(featureRanks))
      const [lowColor, highColor] = colorScales[featureIndex]

      const getColor = (value) => {
        const valueRatio = (value - min) / (max - min)
        const interpolate = (start, end, ratio) =>
          Math.round(start + (end - start) * ratio)
        const r = interpolate(
          parseInt(lowColor.slice(1, 3), 16),
          parseInt(highColor.slice(1, 3), 16),
          valueRatio
        )
        const g = interpolate(
          parseInt(lowColor.slice(3, 5), 16),
          parseInt(highColor.slice(3, 5), 16),
          valueRatio
        )
        const b = interpolate(
          parseInt(lowColor.slice(5, 7), 16),
          parseInt(highColor.slice(5, 7), 16),
          valueRatio
        )
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      }

      this.geojsonLayer.eachLayer((layer) => {
        const props = layer.feature.properties
        const rank = featureRanks[props.name]

        if (rank !== undefined) {
          layer.setStyle({
            fillColor: getColor(rank, min, max, lowColor, highColor),
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

      this.updateLegend(
        min,
        max,
        lowColor,
        highColor,
        this.featureLabels[featureIndex]
      )
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
