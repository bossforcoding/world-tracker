import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

import App from './App';

// react-native-svg forwards RN's responder props (onStartShouldSetResponder etc.)
// to the DOM on web, which react-dom logs as console.error but doesn't affect
// behavior. Known upstream issue: software-mansion/react-native-svg#1078.
LogBox.ignoreLogs(['Unknown event handler property']);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
