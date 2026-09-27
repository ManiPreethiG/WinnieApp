import React, { useRef } from "react";
import { StyleSheet, Animated, Dimensions } from "react-native";
import {
  GestureHandlerRootView,
  PinchGestureHandler,
  State,
} from "react-native-gesture-handler";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2;

const MAX_SCALE = 3.5;

/**
 * Instagram / WhatsApp / Photos style ZoomContainer:
 * - 1 finger: 100% normal scrolling, completely unaffected.
 * - 2 fingers pinch: zooms smoothly around focal point.
 * - Compression (< 1x): strictly clamped so NO white borders or margins appear.
 * - On release: fluidly springs back to normal size (scale: 1, offset: 0).
 */
export default function ZoomContainer({ children }) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const startFocalX = useRef(CENTER_X);
  const startFocalY = useRef(CENTER_Y);

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  function onPinchEvent(event) {
    const { scale: eventScale, focalX, focalY } = event.nativeEvent;
    if (!focalX || !focalY) return;

    // Like Photos / Instagram: never compress below 1x (no white borders)
    const targetScale = clamp(eventScale, 1.0, MAX_SCALE);

    if (targetScale <= 1.01) {
      scale.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
      return;
    }

    // Maximum shift allowed so content edges stay bounded to the screen
    const maxTx = (SCREEN_WIDTH * (targetScale - 1)) / 2;
    const maxTy = (SCREEN_HEIGHT * (targetScale - 1)) / 2;

    // Shift to keep the focal point under fingers
    const focalShiftX = (CENTER_X - startFocalX.current) * (targetScale - 1);
    const focalShiftY = (CENTER_Y - startFocalY.current) * (targetScale - 1);

    // Follow fingers movement
    const fingerDeltaX = focalX - startFocalX.current;
    const fingerDeltaY = focalY - startFocalY.current;

    const targetTx = clamp(focalShiftX + fingerDeltaX, -maxTx, maxTx);
    const targetTy = clamp(focalShiftY + fingerDeltaY, -maxTy, maxTy);

    scale.setValue(targetScale);
    translateX.setValue(targetTx);
    translateY.setValue(targetTy);
  }

  function onPinchStateChange(event) {
    const { state, oldState, focalX, focalY } = event.nativeEvent;

    if (state === State.BEGAN || state === State.ACTIVE) {
      startFocalX.current = focalX || CENTER_X;
      startFocalY.current = focalY || CENTER_Y;
    }

    // When fingers are lifted, smoothly spring back to normal size (Instagram / WhatsApp behavior)
    if (state === State.END || state === State.CANCELLED || oldState === State.ACTIVE) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 18,
        }),
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 200,
          friction: 18,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 200,
          friction: 18,
        }),
      ]).start();
    }
  }

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <PinchGestureHandler
        onGestureEvent={onPinchEvent}
        onHandlerStateChange={onPinchStateChange}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                { translateX },
                { translateY },
                { scale },
              ],
            },
          ]}
        >
          {children}
        </Animated.View>
      </PinchGestureHandler>
    </GestureHandlerRootView>
  );
}
