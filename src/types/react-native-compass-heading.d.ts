declare module 'react-native-compass-heading' {
  interface CompassHeadingData {
    heading: number;
    accuracy: number;
  }

  interface CompassHeadingModule {
    start: (degreeUpdateRate: number, callback: (data: CompassHeadingData) => void) => void;
    stop: () => void;
  }

  const CompassHeading: CompassHeadingModule;
  export default CompassHeading;
}
