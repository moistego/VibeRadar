import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface SensorData {
  heading: number;
  headingAccuracy: number;
  isMoving: boolean;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracy: number | null;
  gpsAvailable: boolean;
  isCalibrating: boolean;
  lastUpdateTimestamp: number;
}

const initialState: SensorData = {
  heading: 0,
  headingAccuracy: 0,
  isMoving: false,
  latitude: null,
  longitude: null,
  gpsAccuracy: null,
  gpsAvailable: false,
  isCalibrating: false,
  lastUpdateTimestamp: 0,
};

const sensorsSlice = createSlice({
  name: 'sensors',
  initialState,
  reducers: {
    updateHeading: (
      state,
      action: PayloadAction<{heading: number; accuracy: number}>,
    ) => {
      state.heading = action.payload.heading;
      state.headingAccuracy = action.payload.accuracy;
      state.lastUpdateTimestamp = Date.now();
    },
    setMotionState: (state, action: PayloadAction<boolean>) => {
      state.isMoving = action.payload;
    },
    updateGPSPosition: (
      state,
      action: PayloadAction<{
        latitude: number;
        longitude: number;
        accuracy: number;
      }>,
    ) => {
      state.latitude = action.payload.latitude;
      state.longitude = action.payload.longitude;
      state.gpsAccuracy = action.payload.accuracy;
      state.gpsAvailable = true;
    },
    setGPSAvailability: (state, action: PayloadAction<boolean>) => {
      state.gpsAvailable = action.payload;
      if (!action.payload) {
        state.latitude = null;
        state.longitude = null;
        state.gpsAccuracy = null;
      }
    },
    setCalibrating: (state, action: PayloadAction<boolean>) => {
      state.isCalibrating = action.payload;
    },
    resetSensors: () => initialState,
  },
});

export const {
  updateHeading,
  setMotionState,
  updateGPSPosition,
  setGPSAvailability,
  setCalibrating,
  resetSensors,
} = sensorsSlice.actions;
export default sensorsSlice.reducer;
