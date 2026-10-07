# World Tracker

A mobile app to keep track of the places you have visited around the world, built with React Native and Expo.

## Features

- **Interactive world map:** tap a country to mark it as visited and see how much of the world you have explored
- **Regions and cities:** open a country to mark individual regions on its map and the cities within them
- **World capitals:** a searchable list of capitals to tick off
- **Passport:** a summary of your travels with progress by continent and the list of visited countries
- **Badges:** unlock achievements for continents explored and country milestones (1, 5, 25, 100 countries)
- **Search** across countries, regions and cities
- **5 languages:** English, Italian, German, French and Spanish, selected automatically from the device
- Data is stored locally on the device, with no account required

## Getting started

Requires Node.js and the [Expo](https://expo.dev) tooling.

```bash
npm install
npx expo start
```

Then open the app in Expo Go, an Android emulator, an iOS simulator, or the browser (press `w`).

### Build an Android APK

```bash
npx eas build --profile preview --platform android
```

## Project structure

```
screens/      Map, country detail, capitals and passport screens
components/   World map (SVG) and search bar
lib/          Visited-places state, storage, badges, geographic data, i18n
assets/       Country, region and city datasets
scripts/      Scripts that generate the map and geographic datasets
```

## Tech stack

React Native · Expo · TypeScript · React Navigation · react-native-svg · i18next · AsyncStorage

## License

[MIT](LICENSE)
