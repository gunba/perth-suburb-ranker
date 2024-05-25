<template>
  <div id="app">
    <div id="sidebar">
      <label>
        <input type="checkbox" v-model="showSuburbs" @change="toggleSuburbs" />
        Show Suburb Boundaries
      </label>
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
    <div id="map-container"></div>
    <div id="legend"></div>
  </div>
</template>

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
      featureLabels: [
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
      averages: {},
      ranks: {},
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

      this.calculateAverages()
      this.calculateRanks()
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
        style: () => ({ color: '#3388ff', weight: 3, fillOpacity: 0 }),
      }).addTo(toRaw(map))
    },
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
    toggleSuburbs() {
      this.selectedFeature = null
      if (this.showSuburbs) {
        this.geojsonLayer.setStyle({
          color: '#3388ff',
          weight: 3,
          fillOpacity: 0,
        })
      } else {
        this.geojsonLayer.setStyle({ fillOpacity: 0 })
      }
    },
    onSuburbClick(e) {
      const layer = e.target

      if (this.selectedSuburb) {
        this.selectedSuburb.setStyle({ fillOpacity: 0 })
      }

      layer.setStyle({ fillOpacity: 0.5 })
      this.selectedSuburb = layer
    },
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
    onSuburbMouseout(e) {
      e.target.closeTooltip()
    },
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

      Object.keys(featureValues).forEach((feature) => {
        featureValues[feature].sort((a, b) => a.value - b.value)
        this.ranks[feature] = {}
        featureValues[feature].forEach((item, index) => {
          this.ranks[feature][item.name] = index + 1
        })
      })
    },
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
        ['#0000ff', '#ff0000'], // Crime per capita
        ['#0000ff', '#ff0000'], // Crime trend
        ['#ffeda0', '#f03b20'], // Population density
        ['#feb24c', '#f03b20'], // Gender ratio
        ['#c7e9b4', '#081d58'], // Median age
        ['#deebf7', '#3182bd'], // Median income
        ['#e0ecf4', '#8856a7'], // Australian born
        ['#a6bddb', '#2b8cbe'], // Only English used at home
        ['#fed976', '#fc4e2a'], // Participation in labour force
        ['#ffeda0', '#f03b20'], // Home ownership
        ['#dadaeb', '#6a51a3'], // Median house price
        ['#fa9fb5', '#c51b8a'], // Suburb sales growth
        ['#e7e1ef', '#dd1c77'], // Suburb interest level
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

      this.updateLegend(min, max, lowColor, highColor)
    },
    updateLegend(min, max, lowColor, highColor) {
      const interpolateColor = (ratio) => {
        const r = Math.ceil(
          parseInt(lowColor.slice(1, 3), 16) * (1 - ratio) +
            parseInt(highColor.slice(1, 3), 16) * ratio
        )
        const g = Math.ceil(
          parseInt(lowColor.slice(3, 5), 16) * (1 - ratio) +
            parseInt(highColor.slice(3, 5), 16) * ratio
        )
        const b = Math.ceil(
          parseInt(lowColor.slice(5, 7), 16) * (1 - ratio) +
            parseInt(highColor.slice(5, 7), 16) * ratio
        )
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      }

      const createLegend = () => {
        const div = L.DomUtil.create('div', 'info legend')
        const grades = [min, (min + max) / 2, max]
        const labels = []

        grades.forEach((grade, index) => {
          const color = interpolateColor(index / (grades.length - 1))
          labels.push(`<i style="background:${color}"></i> ${grade}`)
        })

        div.innerHTML = labels.join('<br>')
        return div
      }

      if (this.legend) {
        map.removeControl(this.legend)
      }

      this.legend = L.control({ position: 'bottomright' })
      this.legend.onAdd = createLegend
      this.legend.addTo(map)
    },
  },
}
</script>

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

.info.legend {
  background: white;
  padding: 6px 8px;
  font:
    14px/16px Arial,
    Helvetica,
    sans-serif;
  border-radius: 5px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
}

.info.legend i {
  width: 18px;
  height: 18px;
  float: left;
  margin-right: 8px;
  opacity: 0.7;
}
</style>
